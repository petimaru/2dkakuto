(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const menuMatchup = document.getElementById("menuMatchup");
  const characterStep = document.getElementById("characterStep");
  const difficultyStep = document.getElementById("difficultyStep");
  const result = document.getElementById("result");
  const resultTitle = document.getElementById("resultTitle");
  const resultReason = document.getElementById("resultReason");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const moveZone = document.getElementById("moveZone");
  const actionZone = document.getElementById("actionZone");
  const characterButtons = [...document.querySelectorAll(".character-button")];
  const difficultyButtons = [...document.querySelectorAll(".difficulty-button")];

  const W = canvas.width;
  const H = canvas.height;
  const ring = { left: 42, right: 678, top: 520, bottom: 1030 };
  const ropes = { left: 64, right: 656 };
  const floorY = 900;
  const lane = { top: 730, bottom: 990 };
  const dashSeconds = 2.2;
  const dashSpeedX = 470;
  const dashSpeedY = 340;
  const staminaRecovery = 10;
  const tiredSeconds = 2.4;
  const matchSeconds = 99;

  const difficultySettings = {
    easy: { label: "Easy", aiDelay: 0.86, aiAggression: 0.42, mash: 4.6, defense: 0.7 },
    normal: { label: "Normal", aiDelay: 0.58, aiAggression: 0.58, mash: 6.4, defense: 0.86 },
    hard: { label: "Hard", aiDelay: 0.36, aiAggression: 0.76, mash: 8.2, defense: 1.05 },
  };

  const characters = {
    rooeeebee: { name: "ROOEEBEE", width: 116, height: 246, normalHeight: 252, koHeight: 244, koScale: 0.6 },
    petiman: { name: "PETIMAN", width: 132, height: 210, normalHeight: 214, koHeight: 212, koScale: 0.8 },
  };

  const moves = {
    punch: { label: "PUNCH", damage: 7, range: 78, stun: 0.18, cost: 8 },
    highKick: { label: "HIGH KICK", damage: 11, range: 92, stun: 0.3, cost: 13 },
    lowKick: { label: "LOW KICK", damage: 9, range: 82, stun: 0.42, cost: 11 },
    lariat: { label: "LARIAT", damage: 18, range: 112, stun: 0.5, cost: 16 },
    headbutt: { label: "HEADBUTT", damage: 15, range: 70, stun: 0.34, cost: 10 },
    backdrop: { label: "BACKDROP", damage: 24, range: 88, stun: 0.58, cost: 22 },
    suplex: { label: "BRAINBUSTER", damage: 30, range: 78, stun: 0.72, cost: 28 },
  };

  const game = {
    state: "menu",
    difficulty: "easy",
    playerCharacter: "rooeeebee",
    time: matchSeconds,
    timerCarry: 0,
    message: "SELECT YOUR WRESTLER",
    messageTimer: 0,
    shake: 0,
    last: performance.now(),
    aiThink: 0,
    grab: null,
    grabContest: null,
    submission: null,
    throwAnim: null,
    damageTexts: [],
    ko: null,
    winner: null,
  };

  const p1 = makeFighter("rooeeebee", 230, 1, true);
  const p2 = makeFighter("petiman", 490, -1, false);
  const arenaImage = loadSprite("./assets/backgrounds/ring-arena.png");
  const figureFourImages = {
    rooeeebee: loadSprite("./assets/sprites/figure-four.png"),
    petiman: loadSprite("./assets/sprites/figure-four-petiman.png"),
  };
  // Sprite assets are authored facing right; ctx.scale(f.facing, 1) flips them in-game.
  const spriteImages = {
    rooeeebee: {
      idle: loadSprite("./assets/sprites/rooeeebee-idle.png"),
      punch: loadSprite("./assets/sprites/rooeeebee-punch.png"),
      highKick: loadSprite("./assets/sprites/rooeeebee-high-kick.png"),
      lowKick: loadSprite("./assets/sprites/rooeeebee-low-kick.png"),
      lariat: loadSprite("./assets/sprites/rooeeebee-lariat.png"),
      damage: loadSprite("./assets/sprites/rooeeebee-damage.png"),
      tired: loadSprite("./assets/sprites/rooeeebee-tired.png"),
      guard: loadSprite("./assets/sprites/rooeeebee-guard.png"),
      grab: loadSprite("./assets/sprites/rooeeebee-grab.png"),
      ko: loadSprite("./assets/sprites/rooeeebee-ko.png"),
      run: [
        loadSprite("./assets/sprites/rooeeebee-run-1.png"),
        loadSprite("./assets/sprites/rooeeebee-run-2.png"),
      ],
    },
    petiman: {
      idle: loadSprite("./assets/sprites/petiman-idle.png"),
      punch: loadSprite("./assets/sprites/petiman-punch.png"),
      highKick: loadSprite("./assets/sprites/petiman-high-kick.png"),
      lowKick: loadSprite("./assets/sprites/petiman-low-kick.png"),
      lariat: loadSprite("./assets/sprites/petiman-lariat.png"),
      damage: loadSprite("./assets/sprites/petiman-damage.png"),
      tired: loadSprite("./assets/sprites/petiman-tired.png"),
      guard: loadSprite("./assets/sprites/petiman-guard.png"),
      grab: loadSprite("./assets/sprites/petiman-grab.png"),
      ko: loadSprite("./assets/sprites/petiman-ko.png"),
      run: [
        loadSprite("./assets/sprites/petiman-run-1.png"),
        loadSprite("./assets/sprites/petiman-run-2.png"),
      ],
    },
  };

  function loadSprite(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  function makeFighter(character, x, facing, player) {
    const config = characters[character];
    return {
      name: config.name,
      character,
      x,
      y: floorY,
      vx: 0,
      vy: 0,
      facing,
      hp: 100,
      sp: 22,
      width: config.width,
      height: config.height,
      guard: 0,
      stun: 0,
      tired: 0,
      attack: 0,
      attackName: "",
      attackKind: "",
      downPose: 0,
      dash: 0,
      dashAxis: "",
      invuln: 0,
      grabbed: false,
      player,
      aiMode: "idle",
      aiModeTimer: 0,
      aiX: 0,
      aiY: 0,
      mashCount: 0,
      mashWindow: [],
      lastAction: 0,
    };
  }

  function opponentCharacter(character) {
    return character === "rooeeebee" ? "petiman" : "rooeeebee";
  }

  function previewSelectedMatchup() {
    const cpuCharacter = opponentCharacter(game.playerCharacter);
    Object.assign(p1, makeFighter(game.playerCharacter, 230, 1, true));
    Object.assign(p2, makeFighter(cpuCharacter, 490, -1, false));
    menuMatchup.textContent = `${p1.name} vs ${p2.name}`;
  }

  function resetMatch() {
    const cpuCharacter = opponentCharacter(game.playerCharacter);
    Object.assign(p1, makeFighter(game.playerCharacter, 230, 1, true));
    Object.assign(p2, makeFighter(cpuCharacter, 490, -1, false));
    game.state = "play";
    game.time = matchSeconds;
    game.timerCarry = 0;
    game.message = `${difficultySettings[game.difficulty].label.toUpperCase()} MATCH`;
    game.messageTimer = 1.2;
    game.shake = 0;
    game.aiThink = 0;
    game.grab = null;
    game.grabContest = null;
    game.submission = null;
    game.throwAnim = null;
    game.damageTexts = [];
    game.ko = null;
    game.winner = null;
    menu.hidden = true;
    result.hidden = true;
  }

  function endMatch(winner, reason) {
    game.state = "result";
    game.winner = winner;
    resultTitle.textContent = `${winner.name} WIN`;
    resultReason.textContent = reason;
    result.hidden = false;
  }

  function startKoSequence(winner, loser, reason, options = {}) {
    if (game.state === "ko" || game.state === "result") return;
    clearGrab();
    game.grabContest = null;
    game.submission = null;
    game.throwAnim = null;
    game.state = "ko";
    game.winner = winner;
    game.ko = {
      winner,
      loser,
      reason,
      phase: options.skipFly ? "down" : "fly",
      timer: 0,
    };
    loser.hp = 0;
    loser.stun = 2;
    loser.tired = 0;
    loser.guard = 0;
    loser.attack = 0;
    loser.dash = 0;
    loser.vx = options.skipFly ? 0 : loser.facing * -190;
    loser.vy = options.skipFly ? 0 : -165;
    winner.vx = 0;
    winner.vy = 0;
    game.message = "KO!";
    game.messageTimer = 2.2;
    result.hidden = true;
  }

  characterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      game.playerCharacter = button.dataset.character;
      characterButtons.forEach((b) => b.classList.toggle("is-active", b === button));
      previewSelectedMatchup();
      characterStep.hidden = true;
      difficultyStep.hidden = false;
      game.message = "SELECT DIFFICULTY";
    });
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      game.difficulty = button.dataset.difficulty;
      difficultyButtons.forEach((b) => b.classList.toggle("is-active", b === button));
      game.message = `${difficultySettings[game.difficulty].label.toUpperCase()} READY`;
    });
  });

  startButton.addEventListener("click", resetMatch);
  restartButton.addEventListener("click", () => {
    result.hidden = true;
    menu.hidden = false;
    characterStep.hidden = false;
    difficultyStep.hidden = true;
    characterButtons.forEach((button) => button.classList.remove("is-active"));
    menuMatchup.textContent = "SELECT YOUR WRESTLER";
    game.state = "menu";
    game.message = "SELECT YOUR WRESTLER";
  });

  const input = {
    movePointer: null,
    actionPointer: null,
    moveStartX: 0,
    moveStartY: 0,
    moveX: 0,
    moveY: 0,
    actionStartX: 0,
    actionStartY: 0,
    actionStartTime: 0,
  };

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  }

  moveZone.addEventListener("pointerdown", (event) => {
    if (input.movePointer !== null) return;
    input.movePointer = event.pointerId;
    moveZone.setPointerCapture(event.pointerId);
    const p = localPoint(event);
    input.moveStartX = p.x;
    input.moveStartY = p.y;
    input.moveX = 0;
    input.moveY = 0;
  });

  moveZone.addEventListener("pointermove", (event) => {
    if (event.pointerId !== input.movePointer) return;
    const p = localPoint(event);
    input.moveX = clamp((p.x - input.moveStartX) / 70, -1, 1);
    input.moveY = clamp((p.y - input.moveStartY) / 70, -1, 1);
  });

  function clearMove(event) {
    if (event.pointerId !== input.movePointer) return;
    input.movePointer = null;
    input.moveX = 0;
    input.moveY = 0;
  }

  moveZone.addEventListener("pointerup", clearMove);
  moveZone.addEventListener("pointercancel", clearMove);

  actionZone.addEventListener("pointerdown", (event) => {
    if (input.actionPointer !== null) return;
    input.actionPointer = event.pointerId;
    actionZone.setPointerCapture(event.pointerId);
    const p = localPoint(event);
    input.actionStartX = p.x;
    input.actionStartY = p.y;
    input.actionStartTime = performance.now();
    countMash(p1);
  });

  actionZone.addEventListener("pointerup", (event) => {
    if (event.pointerId !== input.actionPointer) return;
    const p = localPoint(event);
    const dx = p.x - input.actionStartX;
    const dy = p.y - input.actionStartY;
    const elapsed = performance.now() - input.actionStartTime;
    input.actionPointer = null;
    handleActionGesture(dx, dy, elapsed);
  });

  actionZone.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== input.actionPointer) return;
    input.actionPointer = null;
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") input.moveX = -1;
    if (event.key === "ArrowRight") input.moveX = 1;
    if (event.key === "w") input.moveY = -1;
    if (event.key === "s") input.moveY = 1;
    if (event.key === " ") handleActionGesture(0, 0, 0);
    if (event.key === "ArrowUp") handleActionGesture(0, -90, 0);
    if (event.key === "ArrowDown") handleActionGesture(0, 90, 0);
    if (event.key === "a") handleActionGesture(-90, 0, 0);
    if (event.key === "d") handleActionGesture(90, 0, 0);
  });

  window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") input.moveX = 0;
    if (event.key === "w" || event.key === "s") input.moveY = 0;
  });

  function handleActionGesture(dx, dy, elapsed) {
    if (game.state !== "play") return;
    if (game.throwAnim) return;
    if (game.submission) {
      countMash(p1);
      return;
    }
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const tap = Math.max(absX, absY) < 34 && elapsed < 320;
    const toward = Math.sign(dx) === p1.facing && absX > 46 && absX > absY;
    const away = Math.sign(dx) === -p1.facing && absX > 46 && absX > absY;

    if (p1.dash > 0 && tap) return performLariat(p1, p2);

    if (game.grab && isInGrab(p1)) {
      const contestAction = classifyGrabAction(tap, absX, absY, dy, toward, away);
      if (game.grabContest) {
        if (contestAction) countGrabContestInput(p1, contestAction);
        return;
      }
      if (contestAction) return executeGrabAction(p1, p2, contestAction);
      return;
    }

    if (tap) return tryStrike(p1, p2, "punch");
    if (absY > absX && dy < -42) return tryStrike(p1, p2, "highKick");
    if (absY > absX && dy > 42) return tryStrike(p1, p2, "lowKick");
    if (toward) return tryGrab(p1, p2);
    if (away) return startGuard(p1);
  }

  function update(dt) {
    if (game.state === "ko") {
      updateKoSequence(dt);
      return;
    }
    if (game.state !== "play") return;

    game.timerCarry += dt;
    if (game.timerCarry >= 1) {
      game.timerCarry -= 1;
      game.time = Math.max(0, game.time - 1);
      if (game.time === 0) {
        if (p1.hp === p2.hp) endMatch(p1, "TIME UP DRAW ADVANTAGE");
        else endMatch(p1.hp > p2.hp ? p1 : p2, "TIME UP");
      }
    }

    updateFighterTimers(p1, dt);
    updateFighterTimers(p2, dt);

    if (game.messageTimer > 0) game.messageTimer -= dt;
    if (game.shake > 0) game.shake -= dt;
    updateDamageTexts(dt);

    if (game.submission) {
      updateSubmission(dt);
      return;
    }

    if (game.throwAnim) {
      updateThrowAnimation(dt);
      return;
    }

    if (game.grab) {
      maintainGrab(dt);
      updateGrabContest(dt);
      if (!game.grabContest) updateAiGrab(dt);
    } else {
      updateMovement(p1, input.moveX, input.moveY, dt);
      updateAi(dt);
    }

    p1.sp = clamp(p1.sp + dt * staminaRecovery, 0, 100);
    p2.sp = clamp(p2.sp + dt * staminaRecovery, 0, 100);

    faceEachOther();
    checkRopes(p1);
    checkRopes(p2);
    checkHp();
  }

  function updateFighterTimers(f, dt) {
    f.guard = Math.max(0, f.guard - dt);
    f.stun = Math.max(0, f.stun - dt);
    f.tired = Math.max(0, f.tired - dt);
    f.attack = Math.max(0, f.attack - dt);
    f.downPose = Math.max(0, f.downPose - dt);
    f.dash = Math.max(0, f.dash - dt);
    if (f.dash <= 0) f.dashAxis = "";
    f.invuln = Math.max(0, f.invuln - dt);
  }

  function updateKoSequence(dt) {
    updateDamageTexts(dt);
    if (game.messageTimer > 0) game.messageTimer -= dt;
    if (game.shake > 0) game.shake -= dt;
    if (!game.ko) return;

    const ko = game.ko;
    const loser = ko.loser;
    ko.timer += dt;

    if (ko.phase === "fly") {
      loser.stun = 0.2;
      loser.x += loser.vx * dt;
      loser.y += loser.vy * dt;
      loser.vy += 125 * dt;
      loser.vx *= 0.992;
      loser.x = clamp(loser.x, ring.left + loser.width / 2, ring.right - loser.width / 2);
      loser.y = clamp(loser.y, lane.top, lane.bottom);
      if (ko.timer >= 2) {
        ko.phase = "down";
        ko.timer = 0;
        loser.stun = 0;
        loser.vx = 0;
        loser.vy = 0;
        loser.y = clamp(loser.y, lane.top, lane.bottom);
        game.message = "DOWN!";
        game.messageTimer = 1;
      }
      return;
    }

    if (ko.phase === "down" && ko.timer >= 1) {
      game.ko = null;
      endMatch(ko.winner, ko.reason);
    }
  }

  function updateDamageTexts(dt) {
    game.damageTexts.forEach((text) => {
      text.life -= dt;
      text.y += text.vy * dt;
      text.vy += 34 * dt;
    });
    game.damageTexts = game.damageTexts.filter((text) => text.life > 0);
  }

  function updateMovement(f, directionX, directionY, dt) {
    if (f.dash > 0 && !f.grabbed && f.tired <= 0) {
      f.vx *= 0.998;
      f.vy *= 0.998;
    } else if (f.stun > 0 || f.tired > 0 || f.grabbed || f.attack > 0 || f.downPose > 0) {
      f.vx *= 0.86;
      f.vy *= 0.86;
    } else {
      const speed = 230;
      const length = Math.hypot(directionX, directionY) || 1;
      f.vx = (directionX / length) * speed;
      f.vy = (directionY / length) * speed * 0.72;
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.x = clamp(f.x, ring.left + f.width / 2, ring.right - f.width / 2);
    f.y = clamp(f.y, lane.top, lane.bottom);
  }

  function updateAi(dt) {
    const settings = difficultySettings[game.difficulty];
    game.aiThink -= dt;
    p2.aiModeTimer -= dt;
    const distanceX = Math.abs(p2.x - p1.x);
    const distanceY = Math.abs(p2.y - p1.y);
    const directionX = Math.sign(p1.x - p2.x);
    const directionY = clamp((p1.y - p2.y) / 80, -1, 1);

    if (p2.stun > 0 || p2.tired > 0 || p2.grabbed) {
      updateMovement(p2, 0, 0, dt);
      return;
    }

    if (p2.aiModeTimer <= 0 && p2.dash <= 0) {
      chooseAiMode(distanceX, distanceY, settings);
    }

    if (p2.dash > 0) {
      updateMovement(p2, 0, 0, dt);
    } else if (p2.aiMode === "bounce") {
      updateMovement(p2, p2.aiX, p2.aiY, dt);
    } else if (p2.aiMode === "wander") {
      updateMovement(p2, p2.aiX, p2.aiY, dt);
    } else if (p2.aiMode === "retreat") {
      updateMovement(p2, -directionX, p2.aiY, dt);
    } else if (distanceX > 105 || distanceY > 34) {
      updateMovement(p2, directionX, directionY, dt);
    } else {
      updateMovement(p2, 0, 0, dt);
    }

    if (game.aiThink <= 0) {
      game.aiThink = settings.aiDelay + Math.random() * 0.35;
      if (p2.dash > 0 && distanceX < 118 && distanceY < 58 && Math.random() < settings.aiAggression + 0.28) {
        performLariat(p2, p1);
      } else if (distanceX < 90 && distanceY < 46 && Math.random() < settings.aiAggression) {
        const roll = Math.random();
        if (roll < 0.36) tryStrike(p2, p1, "punch");
        else if (roll < 0.58) tryStrike(p2, p1, "lowKick");
        else if (roll < 0.77) tryStrike(p2, p1, "highKick");
        else tryGrab(p2, p1);
      } else if (distanceX < 110 && distanceY < 52 && Math.random() < 0.28) {
        startGuard(p2);
      }
    }
  }

  function chooseAiMode(distanceX, distanceY, settings) {
    const roll = Math.random();
    const near = distanceX < 130 && distanceY < 70;
    p2.aiModeTimer = 0.55 + Math.random() * 0.85;

    if (roll < 0.24) {
      p2.aiMode = "wander";
      p2.aiX = Math.random() < 0.5 ? -1 : 1;
      p2.aiY = Math.random() < 0.5 ? -1 : 1;
    } else if (roll < 0.43 && near) {
      p2.aiMode = "retreat";
      p2.aiX = 0;
      p2.aiY = Math.random() < 0.5 ? -0.8 : 0.8;
    } else if (roll < 0.43 + settings.aiAggression * 0.34) {
      p2.aiMode = "bounce";
      chooseRopeRunTarget(p2);
      p2.aiModeTimer = 1.3;
    } else {
      p2.aiMode = "approach";
      p2.aiX = 0;
      p2.aiY = 0;
    }
  }

  function chooseRopeRunTarget(f) {
    const horizontalSpace = Math.max(f.x - ropes.left, ropes.right - f.x);
    const verticalSpace = Math.max(f.y - lane.top, lane.bottom - f.y);
    if (horizontalSpace > verticalSpace * 1.35) {
      f.aiX = f.x < (ropes.left + ropes.right) / 2 ? -1 : 1;
      f.aiY = clamp((p1.y - f.y) / 160, -0.45, 0.45);
    } else {
      f.aiX = clamp((p1.x - f.x) / 180, -0.45, 0.45);
      f.aiY = f.y < (lane.top + lane.bottom) / 2 ? -1 : 1;
    }
  }

  function updateAiGrab(dt) {
    if (game.throwAnim || game.grabContest || !game.grab || !isInGrab(p2) || p2.tired > 0) return;
    game.aiThink -= dt;
    if (game.aiThink > 0) return;
    game.aiThink = 0.55 + Math.random() * 0.3;
      const roll = Math.random();
      if (roll < 0.28) ropeThrow(p2, p1);
      else if (roll < 0.5) performThrow(p2, p1, "headbutt");
      else if (roll < 0.72) performThrow(p2, p1, "backdrop");
      else if (roll < 0.88) performThrow(p2, p1, "suplex");
      else startSubmission(p2, p1);
  }

  function updateGrabContest(dt) {
    const contest = game.grabContest;
    if (!contest || !game.grab) return;

    if (contest.intro > 0) {
      contest.intro = Math.max(0, contest.intro - dt);
      game.message = "CLASH!";
      game.messageTimer = 0.2;
      return;
    }

    if (contest.outro > 0) {
      contest.outro = Math.max(0, contest.outro - dt);
      game.message = contest.result ? `${contest.result.fighter.name} ${grabActionLabel(contest.result.action)}` : "BREAK";
      game.messageTimer = 0.2;
      if (contest.outro <= 0) finishGrabContest();
      return;
    }

    contest.timer -= dt;
    countCpuGrabContestInput(dt);
    game.message = `CLASH ${Math.ceil(contest.timer * 10) / 10}`;
    game.messageTimer = 0.2;

    if (contest.timer <= 0) resolveGrabContest();
  }

  function countCpuGrabContestInput(dt) {
    const contest = game.grabContest;
    if (!contest || !isInGrab(p2) || p2.tired > 0) return;
    const settings = difficultySettings[game.difficulty];
    contest.cpuPulse += dt * (settings.mash * 0.95 + 2);
    while (contest.cpuPulse >= 1) {
      contest.cpuPulse -= 1;
      countGrabContestInput(p2, chooseCpuGrabAction());
    }
  }

  function chooseCpuGrabAction() {
    const roll = Math.random();
    if (roll < 0.22) return "tap";
    if (roll < 0.43) return "toward";
    if (roll < 0.64) return "away";
    if (roll < 0.83) return "up";
    return "down";
  }

  function resolveGrabContest() {
    const contest = game.grabContest;
    if (!contest || !game.grab) return;
    let best = { fighter: null, action: "", count: 0 };
    [contest.attacker, contest.defender].forEach((fighter) => {
      const counts = contest.counts.get(fighter);
      Object.entries(counts).forEach(([action, count]) => {
        if (count > best.count) best = { fighter, action, count };
      });
    });

    contest.result = best.fighter && best.count > 0 ? best : null;
    contest.outro = 0.2;
    if (!best.fighter || best.count <= 0) {
      game.message = "BREAK";
      game.messageTimer = 0.25;
      return;
    }

    game.message = `${best.fighter.name} ${grabActionLabel(best.action)}`;
    game.messageTimer = 0.25;
  }

  function finishGrabContest() {
    const contest = game.grabContest;
    if (!contest || !game.grab) return;
    const result = contest.result;
    game.grabContest = null;
    if (!result) {
      clearGrab();
      game.message = "BREAK";
      game.messageTimer = 0.7;
      return;
    }
    executeGrabAction(result.fighter, opponentOf(result.fighter), result.action);
  }

  function tryStrike(attacker, defender, moveName) {
    if (!canAct(attacker)) return;
    const move = moves[moveName];
    if (!spendStamina(attacker, move.cost)) return;
    attacker.attack = 0.22;
    attacker.attackName = move.label;
    attacker.attackKind = moveName;
    attacker.lastAction = performance.now();
    game.message = move.label;
    game.messageTimer = 0.55;

    if (distance(attacker, defender) <= move.range && sameLane(attacker, defender)) {
      damage(defender, attacker, move.damage, move.stun);
    }
  }

  function performLariat(attacker, defender) {
    if (attacker.attack > 0 || attacker.grabbed || game.submission) return;
    const move = moves.lariat;
    if (!spendStamina(attacker, move.cost)) return;
    attacker.attack = 0.32;
    attacker.attackName = move.label;
    attacker.attackKind = "lariat";
    attacker.dash = 0;
    attacker.dashAxis = "";
    attacker.vx *= 0.28;
    attacker.vy *= 0.28;
    game.message = move.label;
    game.messageTimer = 0.75;

    if (distance(attacker, defender) <= move.range && sameLane(attacker, defender)) {
      damage(defender, attacker, move.damage, move.stun);
    }
  }

  function tryGrab(attacker, defender) {
    if (!canAct(attacker)) return;
    if (!spendStamina(attacker, 9)) return;
    attacker.attack = 0.15;
    if (distance(attacker, defender) <= 98 && sameLane(attacker, defender) && defender.guard <= 0 && defender.dash <= 0) {
      game.grab = { a: attacker, b: defender, timer: 2.6 };
      attacker.grabbed = true;
      defender.grabbed = true;
      attacker.attackName = "GRAB";
      startGrabContest(attacker, defender);
    } else {
      game.message = "MISS GRAB";
      game.messageTimer = 0.5;
    }
  }

  function startGuard(f) {
    if (f.stun > 0 || f.tired > 0 || f.grabbed) return;
    f.guard = 0.72;
    f.attackName = "GUARD";
    game.message = `${f.name} GUARD`;
    game.messageTimer = 0.5;
  }

  function startGrabContest(attacker, defender) {
    game.grabContest = {
      intro: 0.2,
      timer: 1,
      outro: 0,
      result: null,
      attacker,
      defender,
      cpuPulse: 0,
      counts: new Map([
        [attacker, makeGrabContestCounts()],
        [defender, makeGrabContestCounts()],
      ]),
    };
    game.message = "CLASH!";
    game.messageTimer = 1.25;
  }

  function makeGrabContestCounts() {
    return { tap: 0, up: 0, down: 0, toward: 0, away: 0 };
  }

  function classifyGrabAction(tap, absX, absY, dy, toward, away) {
    if (tap) return "tap";
    if (absY > absX && dy < -42) return "up";
    if (absY > absX && dy > 42) return "down";
    if (toward) return "toward";
    if (away) return "away";
    return "";
  }

  function countGrabContestInput(f, action) {
    const contest = game.grabContest;
    if (!contest || contest.intro > 0 || contest.outro > 0 || contest.timer <= 0) return;
    const counts = contest.counts.get(f);
    if (!counts || !counts[action]) counts[action] = 0;
    counts[action] += 1;
    game.message = `${f.name} ${grabActionLabel(action)} x${counts[action]}`;
    game.messageTimer = 0.35;
  }

  function grabActionLabel(action) {
    return {
      tap: "THROW",
      up: "BRAIN",
      down: "FIGURE",
      toward: "HEAD",
      away: "BACK",
    }[action] || "";
  }

  function executeGrabAction(attacker, defender, action) {
    if (action === "tap") return ropeThrow(attacker, defender);
    if (action === "up") return performThrow(attacker, defender, "suplex");
    if (action === "down") return startSubmission(attacker, defender);
    if (action === "toward") return performThrow(attacker, defender, "headbutt");
    if (action === "away") return performThrow(attacker, defender, "backdrop");
  }

  function performThrow(attacker, defender, moveName) {
    if (!game.grab || !isInGrab(attacker)) return;
    const move = moves[moveName];
    if (!spendStamina(attacker, move.cost)) return;
    clearGrab();
    if (moveName === "suplex" || moveName === "backdrop" || moveName === "headbutt") {
      startThrowAnimation(attacker, defender, moveName, move);
      return;
    }
    attacker.attack = 0.36;
    attacker.attackName = move.label;
    defender.vx = attacker.facing * 270;
    defender.vy = attacker.y < defender.y ? 90 : -90;
    defender.dash = moveName === "backdrop" ? 0.5 : 0;
    damage(defender, attacker, move.damage, move.stun);
    game.message = move.label;
    game.messageTimer = 1;
  }

  function startThrowAnimation(attacker, defender, kind, move) {
    const duration = kind === "headbutt" ? 0.48 : kind === "backdrop" ? 1.05 : 1.12;
    attacker.attack = duration;
    attacker.attackName = move.label;
    attacker.attackKind = "grab";
    attacker.vx = 0;
    attacker.vy = 0;
    defender.vx = 0;
    defender.vy = 0;
    defender.stun = 1.15;
    defender.downPose = 0;
    defender.dash = 0;
    game.throwAnim = {
      kind,
      attacker,
      defender,
      move,
      timer: 0,
      duration,
      impact: false,
      ax: attacker.x,
      ay: attacker.y,
      dir: attacker.facing,
    };
    game.message = move.label;
    game.messageTimer = duration;
  }

  function updateThrowAnimation(dt) {
    const anim = game.throwAnim;
    anim.timer += dt;
    const { attacker, defender, move, dir } = anim;

    attacker.x = anim.ax;
    attacker.y = anim.ay;
    attacker.vx = 0;
    attacker.vy = 0;
    defender.vx = 0;
    defender.vy = 0;
    defender.stun = Math.max(defender.stun, 0.12);

    const impactAt = anim.kind === "headbutt" ? 0.2 : anim.kind === "backdrop" ? 0.72 : 0.82;
    if (!anim.impact && anim.timer >= impactAt) {
      anim.impact = true;
      const fallX = anim.kind === "headbutt" ? anim.ax + dir * 92 : anim.kind === "backdrop" ? anim.ax - dir * 94 : anim.ax - dir * 74;
      defender.x = clamp(fallX, ring.left + defender.width / 2, ring.right - defender.width / 2);
      defender.y = clamp(anim.ay + 4, lane.top, lane.bottom);
      defender.downPose = anim.kind === "headbutt" ? 0 : 2;
      damageRaw(defender, move.damage);
      if (anim.kind === "headbutt") {
        defender.vx = dir * 210;
        defender.vy = -34;
        defender.stun = Math.max(defender.stun, move.stun);
      }
      game.shake = anim.kind === "headbutt" ? 0.12 : 0.22;
      game.message = `${move.label}!`;
      game.messageTimer = 0.9;
    }

    if (anim.timer >= anim.duration) {
      attacker.attack = 0;
      attacker.attackName = "";
      defender.stun = Math.max(defender.stun, 0.35);
      if (anim.kind === "headbutt") {
        defender.vx = dir * 210;
        defender.vy = -34;
      }
      game.throwAnim = null;
      const reason = anim.kind === "suplex" ? "BRAINBUSTER KO" : anim.kind === "backdrop" ? "BACKDROP KO" : "HEADBUTT KO";
      if (defender.hp <= 0) startKoSequence(attacker, defender, reason, { skipFly: anim.kind !== "headbutt" });
      else checkHp();
    }
  }

  function ropeThrow(attacker, defender) {
    if (!game.grab || !isInGrab(attacker)) return;
    if (!spendStamina(attacker, 14)) return;
    clearGrab();
    defender.vx = attacker.facing * 560;
    defender.vy = 0;
    defender.stun = 0.24;
    defender.dash = 1.4;
    attacker.attackName = "ROPE THROW";
    game.message = "ROPE THROW";
    game.messageTimer = 0.9;
  }

  function startSubmission(attacker, defender) {
    if (!game.grab || !isInGrab(attacker)) return;
    if (!spendStamina(attacker, 24)) return;
    clearGrab();
    game.submission = {
      attacker,
      defender,
      timer: 10,
      damageTick: 0,
      ropeDir: nearestRopeDir(defender),
    };
    attacker.attackName = "FIGURE FOUR";
    defender.stun = 10;
    defender.vx = 0;
    defender.vy = 0;
    game.message = "FIGURE FOUR";
    game.messageTimer = 1.2;
  }

  function updateSubmission(dt) {
    const s = game.submission;
    const settings = difficultySettings[game.difficulty];
    s.timer -= dt;
    s.damageTick += dt;
    countCpuMash(dt);
    pruneMash(p1);
    pruneMash(p2);

    const attackMash = mashRate(s.attacker);
    const defendMash = mashRate(s.defender);
    const defenderWins = defendMash > attackMash + 0.4;
    const moveSpeed = defenderWins ? 62 + defendMash * 8 : 0;
    s.defender.x += s.ropeDir * moveSpeed * dt;
    s.attacker.x = s.defender.x - s.defender.facing * 54;
    s.attacker.y = s.defender.y + 8;

    if (s.damageTick >= 1) {
      s.damageTick -= 1;
      const base = 4;
      damageRaw(s.defender, base);
    }

    game.message = `FIGURE FOUR ${Math.ceil(s.timer)}`;
    game.messageTimer = 0.2;

    const ropeTouched = s.defender.x - s.defender.width / 2 <= ropes.left || s.defender.x + s.defender.width / 2 >= ropes.right;
    if (ropeTouched) {
      s.defender.stun = 0.45;
      game.message = "ROPE BREAK";
      game.messageTimer = 1;
      game.submission = null;
      return;
    }

    if (s.timer <= 0) {
      endMatch(s.attacker, "GIVE UP");
    }

    if (s.attacker === p2 && Math.random() < settings.defense * dt) countMash(p2);
    checkHp();
  }

  function countCpuMash(dt) {
    const settings = difficultySettings[game.difficulty];
    if (game.submission) {
      const cpu = game.submission.attacker === p2 || game.submission.defender === p2 ? p2 : null;
      if (cpu) {
        const expected = settings.mash * dt;
        if (Math.random() < expected) countMash(cpu);
      }
    }
  }

  function damage(defender, attacker, amount, stun) {
    if (defender.invuln > 0) return;
    let final = amount;
    if (attacker.dash > 0) final *= 1.35;
    if (defender.dash > 0) final *= 1.28;
    if (defender.guard > 0) {
      final *= 0.28;
      stun *= 0.45;
      game.message = "BLOCK";
    }
    damageRaw(defender, final);
    if (defender.dash <= 0) {
      defender.stun = Math.max(defender.stun, stun);
      defender.vx = attacker.facing * (120 + final * 5);
      defender.vy = (defender.y - attacker.y) * 1.8;
    }
    defender.invuln = 0.08;
    game.shake = 0.13;
  }

  function damageRaw(f, amount) {
    const value = Math.max(1, Math.round(amount));
    f.hp = clamp(f.hp - value, 0, 100);
    addDamageText(f.x, f.y - f.height - 8, value);
  }

  function canAct(f) {
    return f.stun <= 0 && f.tired <= 0 && f.attack <= 0 && f.downPose <= 0 && !f.grabbed && !game.submission && !game.throwAnim;
  }

  function maintainGrab(dt) {
    const g = game.grab;
    g.timer -= dt;
    g.b.x = g.a.x + g.a.facing * 58;
    g.b.y = g.a.y;
    g.a.vx = 0;
    g.a.vy = 0;
    g.b.vx = 0;
    g.b.vy = 0;
    if (g.timer <= 0 || g.a.stun > 0 || g.b.stun > 0 || g.a.tired > 0 || g.b.tired > 0) clearGrab();
  }

  function clearGrab() {
    if (game.grab) {
      game.grab.a.grabbed = false;
      game.grab.b.grabbed = false;
    }
    game.grab = null;
    game.grabContest = null;
  }

  function checkRopes(f) {
    const leftHit = f.x - f.width / 2 <= ropes.left && f.vx < 0;
    const rightHit = f.x + f.width / 2 >= ropes.right && f.vx > 0;
    const topHit = f.y <= lane.top && f.vy < 0;
    const bottomHit = f.y >= lane.bottom && f.vy > 0;
    if (leftHit || rightHit || topHit || bottomHit) {
      if (leftHit) f.x = ropes.left + f.width / 2;
      if (rightHit) f.x = ropes.right - f.width / 2;
      f.y = topHit ? lane.top : bottomHit ? lane.bottom : f.y;
      if (f.dash > 0) {
        f.vx = 0;
        f.vy = 0;
        f.dash = 0;
        f.dashAxis = "";
        game.message = "DASH END";
        game.messageTimer = 0.45;
        return;
      }
      if (leftHit || rightHit) {
        f.vx = (leftHit ? 1 : -1) * dashSpeedX;
        f.dashAxis = "x";
      }
      if (topHit || bottomHit) {
        f.vy = (topHit ? 1 : -1) * dashSpeedY;
        f.dashAxis = f.dashAxis === "x" ? "xy" : "y";
      }
      f.dash = dashSeconds;
      f.stun = Math.max(0.08, f.stun);
      game.message = "ROPE BOUNCE";
      game.messageTimer = 0.65;
      game.shake = 0.08;
    }
  }

  function checkHp() {
    if (game.state !== "play") return;
    if (p1.hp <= 0 && p2.hp <= 0) startKoSequence(p1, p2, "DOUBLE KO ADVANTAGE");
    else if (p1.hp <= 0) startKoSequence(p2, p1, "KO");
    else if (p2.hp <= 0) startKoSequence(p1, p2, "KO");
  }

  function faceEachOther() {
    p1.facing = p1.x <= p2.x ? 1 : -1;
    p2.facing = p2.x <= p1.x ? 1 : -1;
  }

  function nearestRopeDir(f) {
    const leftDistance = Math.abs(f.x - ropes.left);
    const rightDistance = Math.abs(ropes.right - f.x);
    return leftDistance < rightDistance ? -1 : 1;
  }

  function isInGrab(f) {
    return game.grab && (game.grab.a === f || game.grab.b === f);
  }

  function opponentOf(f) {
    return f === p1 ? p2 : p1;
  }

  function spendStamina(f, cost) {
    if (f.sp < cost) {
      f.sp = 0;
      f.tired = tiredSeconds;
      f.attack = 0;
      f.dash = 0;
      f.vx = 0;
      f.vy = 0;
      game.message = `${f.name} TIRED`;
      game.messageTimer = 0.9;
      if (isInGrab(f)) clearGrab();
      return false;
    }
    f.sp = clamp(f.sp - cost, 0, 100);
    if (f.sp <= 0) {
      f.tired = tiredSeconds;
      game.message = `${f.name} TIRED`;
      game.messageTimer = 0.9;
    }
    return true;
  }

  function addDamageText(x, y, amount) {
    game.damageTexts.push({
      x,
      y,
      value: amount,
      life: 0.85,
      vy: -72,
    });
  }

  function countMash(f) {
    const now = performance.now();
    f.mashWindow.push(now);
    pruneMash(f);
  }

  function pruneMash(f) {
    const cutoff = performance.now() - 1000;
    while (f.mashWindow.length && f.mashWindow[0] < cutoff) f.mashWindow.shift();
  }

  function mashRate(f) {
    pruneMash(f);
    return f.mashWindow.length;
  }

  function distance(a, b) {
    return Math.abs(a.x - b.x);
  }

  function sameLane(a, b) {
    return Math.abs(a.y - b.y) < 54;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function render() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }
    if (game.grabContest) {
      ctx.save();
      applyGrabContestCamera();
    }
    drawArena();
    [p1, p2].sort((a, b) => a.y - b.y).forEach((fighter) => {
      if (game.submission && (fighter === game.submission.attacker || fighter === game.submission.defender)) return;
      if (game.throwAnim && (fighter === game.throwAnim.attacker || fighter === game.throwAnim.defender)) return;
      drawFighter(fighter);
    });
    drawSubmissionHold();
    drawThrowAnimation();
    drawEffects();
    drawGrabContestEffects();
    if (game.grabContest) ctx.restore();
    drawHud();
    drawDamageTexts();
    drawDebugHints();
    ctx.restore();
  }

  function applyGrabContestCamera() {
    const contest = game.grabContest;
    const centerX = (contest.attacker.x + contest.defender.x) / 2;
    const centerY = Math.min(lane.bottom - 100, Math.max(lane.top + 80, (contest.attacker.y + contest.defender.y) / 2 - 96));
    let zoomProgress = 1 - clamp(contest.intro / 0.2, 0, 1);
    if (contest.outro > 0) zoomProgress = clamp(contest.outro / 0.2, 0, 1);
    const scale = 1 + 0.16 * zoomProgress;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
  }

  function drawArena() {
    if (arenaImage.complete && arenaImage.naturalWidth > 0) {
      ctx.drawImage(arenaImage, 0, 0, W, H);
      drawGeneratedArenaLabels();
      return;
    }

    const crowdTop = 138;
    ctx.fillStyle = "#08080b";
    ctx.fillRect(0, 0, W, H);

    for (let y = crowdTop; y < 520; y += 18) {
      for (let x = 0; x < W; x += 18) {
        const c = (x * 17 + y * 23) % 7;
        ctx.fillStyle = ["#1b1517", "#332018", "#17311e", "#202b56", "#4a183a", "#5b431c", "#121212"][c];
        ctx.fillRect(x, y, 14, 14);
        if ((x + y) % 5 === 0) {
          ctx.fillStyle = "#c78652";
          ctx.fillRect(x + 4, y + 2, 6, 6);
        }
      }
    }

    drawSign(70, 232, "ROOEEBEE", "#9f2634");
    drawSign(478, 244, "PETIMAN!", "#d8d6cf", "#111");
    drawSign(36, 420, "GO! GO!", "#244f9c");
    drawSign(542, 420, "PETI WIN", "#a32124");

    ctx.fillStyle = "#1f66bc";
    ctx.fillRect(ring.left, ring.top, ring.right - ring.left, ring.bottom - ring.top);
    ctx.fillStyle = "#2e83d7";
    ctx.fillRect(ring.left + 20, ring.top + 42, ring.right - ring.left - 40, ring.bottom - ring.top - 88);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let i = 0; i < 120; i += 1) {
      const x = ring.left + ((i * 47) % (ring.right - ring.left));
      const y = ring.top + ((i * 31) % (ring.bottom - ring.top));
      ctx.fillRect(x, y, 3, 3);
    }

    ctx.fillStyle = "#f3c02d";
    pixelText("PIXEL", 260, 735, 6, "#f3c02d");
    pixelText("PRO-WRESTLING", 164, 805, 5, "#eef4ff");

    drawRopes();
    drawForegroundCrowd();
  }

  function drawGeneratedArenaLabels() {
    pixelText("ROOEEBEE", 88, 164, 2.55, "#ffe766");
    pixelText("PETIMAN", 516, 172, 2.55, "#111");
    pixelText("GO ROO", 62, 386, 2.45, "#ffe766");
    pixelText("PETI WIN", 584, 368, 2.35, "#ffe766");
  }

  function drawSign(x, y, text, bg, fg = "#f5d65f") {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, 150, 66);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, y + 54, 150, 12);
    pixelText(text, x + 12, y + 18, 2.6, fg);
  }

  function drawRopes() {
    ctx.fillStyle = "#efefef";
    ctx.fillRect(40, 604, 640, 8);
    ctx.fillRect(40, 684, 640, 8);
    ctx.fillStyle = "#cc1828";
    ctx.fillRect(40, 548, 640, 8);
    ctx.fillStyle = "#2f6eff";
    ctx.fillRect(40, 642, 640, 8);
    drawCorner(34, 520, "#d9232f");
    drawCorner(650, 520, "#246dff");
  }

  function drawCorner(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 26, 180);
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(x - 8, y + 36, 46, 12);
    ctx.fillRect(x - 8, y + 88, 46, 12);
    ctx.fillRect(x - 8, y + 140, 46, 12);
  }

  function drawForegroundCrowd() {
    for (let i = 0; i < 10; i += 1) {
      const x = i * 82 - 20;
      const h = 92 + ((i * 37) % 60);
      ctx.fillStyle = ["#6b2337", "#17345d", "#1f5c2b", "#7a6120"][i % 4];
      ctx.fillRect(x + 18, H - h, 52, h);
      ctx.fillStyle = "#8d5534";
      ctx.fillRect(x + 28, H - h - 36, 32, 34);
      ctx.fillRect(x + 6, H - h + 18, 18, 54);
    }
  }

  function drawHud() {
    drawPortrait(28, 18, p1, true);
    drawPortrait(590, 18, p2, false);
    drawStatus(128, 24, p1, true);
    drawStatus(360, 24, p2, false);
    pixelText("TIME", 306, 42, 3.5, "#ffe76b");
    pixelText(String(Math.ceil(game.time)).padStart(2, "0"), 310, 80, 7.8, "#fff");

    drawSp(28, 1180, p1);
    drawSp(414, 1180, p2);

    if (game.messageTimer > 0 || game.state !== "play") {
      pixelText(game.message, 180, 168, 3, "#fff");
    }

    if (game.submission) {
      const s = game.submission;
      const left = s.attacker === p1 ? mashRate(p1) : mashRate(p2);
      const right = s.defender === p1 ? mashRate(p1) : mashRate(p2);
      drawMashPanel(left, right, s.timer);
    }
  }

  function drawPortrait(x, y, f, left) {
    ctx.fillStyle = left ? "#58c7ff" : "#6d6cff";
    ctx.fillRect(x, y, 104, 104);
    ctx.fillStyle = "#111827";
    ctx.fillRect(x + 5, y + 5, 94, 94);

    if (drawPortraitSprite(x + 5, y + 5, 94, f, left)) return;

    ctx.save();
    ctx.translate(x + 52, y + 62);
    ctx.scale(left ? 0.55 : 0.58, 0.55);
    drawFighterBody(f, true);
    ctx.restore();
  }

  function drawPortraitSprite(x, y, size, f, left) {
    const set = spriteImages[f.character];
    const mood = f.hp <= 0 ? "ko" : f.hp <= 50 ? "tired" : "idle";
    const img = set[mood];
    if (!img || !img.complete || img.naturalWidth === 0) return false;

    const crop = portraitCrop(f, mood, img);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();
    if (left || (f.character === "petiman" && mood === "ko")) {
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, x, y, size, size);
    } else {
      ctx.translate(x + size, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, size, size);
    }
    ctx.restore();
    return true;
  }

  function portraitCrop(f, mood, img) {
    const fallback = { x: img.naturalWidth * 0.25, y: 0, w: img.naturalWidth * 0.5, h: img.naturalWidth * 0.5 };
    const crops = f.character === "rooeeebee"
      ? {
          idle: [230, 0, 420, 420],
          tired: [300, 0, 390, 390],
          ko: [18, 34, 500, 500],
        }
      : {
          idle: [145, 18, 560, 560],
          tired: [210, 16, 520, 520],
          ko: [558, 0, 430, 430],
        };
    const [x, y, w, h] = crops[mood] || [fallback.x, fallback.y, fallback.w, fallback.h];
    return {
      x: clamp(x, 0, img.naturalWidth - 1),
      y: clamp(y, 0, img.naturalHeight - 1),
      w: Math.min(w, img.naturalWidth - x),
      h: Math.min(h, img.naturalHeight - y),
    };
  }

  function drawStatus(x, y, f, left) {
    pixelText(left ? "1P" : "2P", x, y - 10, 3.4, left ? "#6ecfff" : "#ff5656");
    pixelText(f.name, x, y + 26, 2.7, "#fff");
    ctx.fillStyle = "#101010";
    ctx.fillRect(x, y + 64, 166, 28);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y + 64, 166, 28);
    ctx.fillStyle = hpColor(f.hp);
    ctx.fillRect(x + 6, y + 70, 154 * (f.hp / 100), 16);
  }

  function drawSp(x, y, f) {
    pixelText("ST", x, y, 4.1, f.tired > 0 ? "#ff5757" : "#ffd640");
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 74, y - 2, 240, 34);
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 74, y - 2, 240, 34);
    const cells = Math.floor(f.sp / 12.5);
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = i < cells ? (f.tired > 0 ? "#ff5757" : "#79f141") : "#2a2a2a";
      ctx.fillRect(x + 82 + i * 28, y + 5, 22, 20);
    }
  }

  function drawMashPanel(attack, defend, time) {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(118, 1014, 484, 86);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(118, 1014, 484, 86);
    pixelText("TAP ACTION!", 230, 1030, 3, "#ffe76b");
    pixelText(`ATK ${attack}`, 150, 1070, 2.5, "#ff7676");
    pixelText(`DEF ${defend}`, 430, 1070, 2.5, "#78d7ff");
    pixelText(`${Math.ceil(time)}`, 340, 1070, 3.2, "#fff");
  }

  function drawFighter(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.facing, 1);
    if (f.stun > 0 && Math.floor(performance.now() / 80) % 2 === 0) ctx.globalAlpha = 0.84;
    drawFighterBody(f, false);
    ctx.restore();

    if (f.attackName && f.attack > 0) {
      pixelText(f.attackName, f.x - 62, f.y - f.height - 28, 2, "#ffe76b");
    }

    if (f.tired > 0) {
      pixelText("TIRED", f.x - 40, f.y - f.height - 52, 2, "#ff5757");
    }

    if (f.dash > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillRect(f.x - f.facing * 85, f.y - 78, 48, 8);
      ctx.fillRect(f.x - f.facing * 114, f.y - 44, 62, 7);
    }
  }

  function drawFighterBody(f, portrait) {
    const isRooeeebee = f.character === "rooeeebee";
    const bob = portrait ? 0 : Math.sin(performance.now() / 130) * 3;
    ctx.translate(0, bob);

    if (!portrait && drawCharacterSprite(f)) return;

    if (isRooeeebee) {
      ctx.fillStyle = "#171717";
      ctx.fillRect(-35, -58, 24, 58);
      ctx.fillRect(8, -58, 24, 58);
      ctx.fillStyle = "#111";
      ctx.fillRect(-42, -5, 36, 12);
      ctx.fillRect(2, -5, 36, 12);
      ctx.fillStyle = "#258fd0";
      ctx.fillRect(-42, -126, 82, 72);
      ctx.fillStyle = "#edc74a";
      ctx.fillRect(-14, -100, 28, 24);
      ctx.fillStyle = "#9a5a34";
      ctx.fillRect(-26, -168, 52, 46);
      ctx.fillStyle = "#3a1f16";
      ctx.fillRect(-32, -180, 58, 22);
      ctx.fillRect(-38, -154, 16, 28);
      ctx.fillStyle = "#f1d137";
      ctx.fillRect(-8, -214, 26, 34);
      ctx.fillStyle = "#fff";
      ctx.fillRect(-4, -196, 18, 8);
      ctx.fillStyle = "#fff";
      ctx.fillRect(5, -154, 9, 8);
      ctx.fillStyle = "#111";
      ctx.fillRect(8, -151, 4, 4);
      ctx.fillStyle = "#fff";
      ctx.fillRect(26, -143, 14, 7);
      ctx.fillStyle = "#9a5a34";
      ctx.fillRect(35, -112, 46, 18);
      ctx.fillRect(-76, -112, 42, 18);
      ctx.fillStyle = "#f3dfc5";
      ctx.fillRect(74, -116, 20, 18);
      ctx.fillRect(-92, -116, 20, 18);
    } else {
      ctx.fillStyle = "#f3d7ae";
      ctx.fillRect(-52, -164, 104, 72);
      ctx.fillStyle = "#7c421b";
      ctx.fillRect(-42, -176, 84, 18);
      ctx.fillStyle = "#195da4";
      ctx.fillRect(-62, -100, 124, 92);
      ctx.fillStyle = "#0d3f78";
      ctx.fillRect(-42, -64, 84, 58);
      ctx.fillStyle = "#f3d7ae";
      ctx.fillRect(-58, -12, 28, 18);
      ctx.fillRect(30, -12, 28, 18);
      ctx.fillStyle = "#111";
      ctx.fillRect(-44, -140, 34, 8);
      ctx.fillRect(10, -140, 34, 8);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 5;
      ctx.strokeRect(-47, -150, 38, 25);
      ctx.strokeRect(9, -150, 38, 25);
      ctx.beginPath();
      ctx.moveTo(-8, -138);
      ctx.lineTo(8, -138);
      ctx.stroke();
      ctx.fillStyle = "#d65568";
      ctx.fillRect(-22, -118, 44, 12);
      ctx.fillStyle = "#195da4";
      ctx.fillRect(52, -88, 32, 22);
      ctx.fillRect(-84, -88, 32, 22);
      ctx.fillStyle = "#f3d7ae";
      ctx.fillRect(78, -92, 20, 20);
      ctx.fillRect(-98, -92, 20, 20);
    }
  }

  function drawCharacterSprite(f) {
    const set = spriteImages[f.character];
    let img = set.idle;
    if (isKoFlying(f)) img = set.damage;
    else if (f.hp <= 0) img = set.ko;
    else if (f.downPose > 0) img = set.ko;
    else if (f.tired > 0) img = set.tired;
    else if (f.guard > 0) img = set.guard;
    else if (f.stun > 0) img = set.damage;
    else if (f.grabbed) img = set.grab;
    else if (f.attack > 0 && set[f.attackKind]) img = set[f.attackKind];
    else if (f.dash > 0) img = set.run[Math.floor(performance.now() / 100) % set.run.length];
    if (!img.complete || img.naturalWidth === 0) return false;
    const config = characters[f.character];
    const koScale = img === set.ko ? config.koScale : 1;
    const targetHeight = config.normalHeight * koScale;
    const targetWidth = targetHeight * (img.naturalWidth / img.naturalHeight);
    if (f.character === "petiman" && img === set.ko && f.facing === -1) ctx.scale(-1, 1);
    ctx.drawImage(img, -targetWidth / 2, -targetHeight, targetWidth, targetHeight);
    return true;
  }

  function drawSubmissionHold() {
    if (!game.submission) return;
    const s = game.submission;
    const img = figureFourImages[s.attacker.character];
    if (!img.complete || img.naturalWidth === 0) return;

    const centerX = (s.attacker.x + s.defender.x) / 2;
    const centerY = Math.max(s.attacker.y, s.defender.y) + 12 + Math.sin(performance.now() / 70) * 2;
    const targetWidth = 342;
    const targetHeight = targetWidth * (img.naturalHeight / img.naturalWidth);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.drawImage(img, -targetWidth / 2, -targetHeight, targetWidth, targetHeight);
    ctx.restore();
  }

  function drawThrowAnimation() {
    if (!game.throwAnim) return;
    const anim = game.throwAnim;
    const t = clamp(anim.timer / anim.duration, 0, 1);
    const attackerSet = spriteImages[anim.attacker.character];
    const defenderSet = spriteImages[anim.defender.character];

    const attackerImg = anim.kind === "headbutt" ? attackerSet.punch : attackerSet.grab;
    const attackerTilt = anim.kind === "backdrop" ? 0.35 * anim.dir : 0;
    drawSpriteAt(anim.attacker, attackerImg, anim.ax, anim.ay, anim.dir, attackerTilt, characters[anim.attacker.character].normalHeight);

    let x = anim.ax + anim.dir * 58;
    let y = anim.ay - 46;
    let rotation = -0.6 * anim.dir;
    let img = defenderSet.damage;
    let height = characters[anim.defender.character].koHeight;

    if (anim.kind === "headbutt") {
      const p = t;
      x = anim.ax + anim.dir * (58 + 42 * p);
      y = anim.ay - 18 + Math.sin(p * Math.PI) * 4;
      rotation = -0.24 * anim.dir;
      if (anim.impact) {
        x = anim.ax + anim.dir * 92;
        y = anim.ay + 2;
        rotation = 0.18 * anim.dir;
      }
    } else if (anim.kind === "backdrop") {
      if (t < 0.42) {
        const p = t / 0.42;
        x = anim.ax + anim.dir * (44 - 30 * p);
        y = anim.ay - 26 - 58 * p;
        rotation = (-0.35 - 0.85 * p) * anim.dir;
      } else if (t < 0.72) {
        const p = (t - 0.42) / 0.3;
        x = anim.ax + anim.dir * (14 - 108 * p);
        y = anim.ay - 84 + 88 * p;
        rotation = (-1.2 - 2.05 * p) * anim.dir;
      } else {
        const p = (t - 0.72) / 0.28;
        x = anim.ax - anim.dir * 94;
        y = anim.ay + 4 - Math.sin(p * Math.PI) * 8;
        rotation = 1.58 * anim.dir;
        img = defenderSet.ko;
        height = koSpriteHeight(anim.defender);
      }
    } else if (t < 0.38) {
      const p = t / 0.38;
      x = anim.ax + anim.dir * (58 - 12 * p);
      y = anim.ay - 34 - 78 * p;
      rotation = -0.45 * anim.dir - 0.45 * anim.dir * p;
    } else if (t < 0.74) {
      const p = (t - 0.38) / 0.36;
      x = anim.ax + anim.dir * (46 - 132 * p);
      y = anim.ay - 112 + 118 * p;
      rotation = (-0.9 - 2.35 * p) * anim.dir;
    } else {
      const p = (t - 0.74) / 0.26;
      x = anim.ax - anim.dir * 74;
      y = anim.ay + 4 - Math.sin(p * Math.PI) * 10;
      rotation = 1.58 * anim.dir;
      img = defenderSet.ko;
      height = koSpriteHeight(anim.defender);
    }

    drawSpriteAt(anim.defender, img, x, y, anim.defender.facing, rotation, height);
  }

  function koSpriteHeight(f) {
    const config = characters[f.character];
    return config.koHeight * config.koScale;
  }

  function drawSpriteAt(f, img, x, y, facing, rotation, targetHeight) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const targetWidth = targetHeight * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.rotate(rotation);
    ctx.drawImage(img, -targetWidth / 2, -targetHeight, targetWidth, targetHeight);
    ctx.restore();
  }

  function isKoFlying(f) {
    return game.ko && game.ko.loser === f && game.ko.phase === "fly";
  }

  function drawEffects() {
  }

  function drawGrabContestEffects() {
    const contest = game.grabContest;
    if (!contest || !game.grab) return;
    const centerX = (contest.attacker.x + contest.defender.x) / 2;
    const top = Math.min(contest.attacker.y - contest.attacker.height, contest.defender.y - contest.defender.height) - 18;
    const bottom = Math.max(contest.attacker.y, contest.defender.y) + 18;
    const width = Math.abs(contest.attacker.x - contest.defender.x) + 178;
    const left = centerX - width / 2;
    const time = performance.now() / 100;

    ctx.save();
    ctx.lineWidth = 5;
    for (let i = 0; i < 18; i += 1) {
      const p = (i / 18 + time * 0.055) % 1;
      const edge = Math.floor(p * 4);
      const local = (p * 4) % 1;
      let x = left;
      let y = top;
      if (edge === 0) x = left + width * local;
      else if (edge === 1) {
        x = left + width;
        y = top + (bottom - top) * local;
      } else if (edge === 2) {
        x = left + width * (1 - local);
        y = bottom;
      } else {
        y = top + (bottom - top) * (1 - local);
      }
      ctx.strokeStyle = i % 2 === 0 ? "#fff66b" : "#59d9ff";
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
    }

    const p1Total = grabContestTotal(p1);
    const p2Total = grabContestTotal(p2);
    pixelText(String(p1Total), centerX - 116, top - 26, 3.2, "#6ecfff");
    pixelText(String(p2Total), centerX + 86, top - 26, 3.2, "#ff5656");
    ctx.restore();
  }

  function grabContestTotal(f) {
    const contest = game.grabContest;
    if (!contest) return 0;
    const counts = contest.counts.get(f);
    if (!counts) return 0;
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }

  function drawDamageTexts() {
    game.damageTexts.forEach((text) => {
      const alpha = clamp(text.life / 0.85, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      pixelText(String(text.value), text.x - 12, text.y, 3, "#ffef6b");
      ctx.restore();
    });
  }

  function drawDebugHints() {
    if (game.state !== "play") return;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(16, 1118, 688, 42);
    pixelText("LEFT DRAG MOVE 8WAY / RIGHT TAP OR SWIPE", 34, 1132, 2, "#dce9ff");
  }

  function hpColor(hp) {
    if (hp > 55) return "#5cff38";
    if (hp > 25) return "#ffe032";
    return "#ff4040";
  }

  const font = {
    A: ["0110", "1001", "1111", "1001", "1001"],
    B: ["1110", "1001", "1110", "1001", "1110"],
    C: ["0111", "1000", "1000", "1000", "0111"],
    D: ["1110", "1001", "1001", "1001", "1110"],
    E: ["1111", "1000", "1110", "1000", "1111"],
    F: ["1111", "1000", "1110", "1000", "1000"],
    G: ["0111", "1000", "1011", "1001", "0111"],
    H: ["1001", "1001", "1111", "1001", "1001"],
    I: ["111", "010", "010", "010", "111"],
    J: ["0011", "0001", "0001", "1001", "0110"],
    K: ["1001", "1010", "1100", "1010", "1001"],
    L: ["1000", "1000", "1000", "1000", "1111"],
    M: ["10001", "11011", "10101", "10001", "10001"],
    N: ["1001", "1101", "1011", "1001", "1001"],
    O: ["0110", "1001", "1001", "1001", "0110"],
    P: ["1110", "1001", "1110", "1000", "1000"],
    Q: ["0110", "1001", "1001", "1011", "0111"],
    R: ["1110", "1001", "1110", "1010", "1001"],
    S: ["0111", "1000", "0110", "0001", "1110"],
    T: ["11111", "00100", "00100", "00100", "00100"],
    U: ["1001", "1001", "1001", "1001", "0110"],
    V: ["1001", "1001", "1001", "0110", "0110"],
    W: ["10001", "10001", "10101", "11011", "10001"],
    X: ["1001", "1001", "0110", "1001", "1001"],
    Y: ["1001", "1001", "0110", "0010", "0010"],
    Z: ["1111", "0001", "0010", "0100", "1111"],
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
    "-": ["000", "000", "111", "000", "000"],
    "!": ["1", "1", "1", "0", "1"],
    ":": ["0", "1", "0", "1", "0"],
    " ": ["0", "0", "0", "0", "0"],
  };

  function pixelText(text, x, y, scale, color) {
    ctx.fillStyle = color;
    let cursor = x;
    const upper = String(text).toUpperCase();
    for (const char of upper) {
      const glyph = font[char] || font[" "];
      for (let row = 0; row < glyph.length; row += 1) {
        for (let col = 0; col < glyph[row].length; col += 1) {
          if (glyph[row][col] === "1") {
            ctx.fillRect(cursor + col * scale, y + row * scale, scale, scale);
          }
        }
      }
      cursor += (glyph[0].length + 1) * scale;
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - game.last) / 1000);
    game.last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  render();
  requestAnimationFrame(loop);
})();
