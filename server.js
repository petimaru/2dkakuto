"use strict";

const http = require("http");

const PORT = Number(process.env.PORT || 8787);
const ROOM_TTL_MS = 10 * 60 * 1000;
const rooms = new Map();

function now() {
  return Date.now();
}

function cleanRooms() {
  const cutoff = now() - ROOM_TTL_MS;
  rooms.forEach((room, code) => {
    if (room.updatedAt < cutoff) rooms.delete(code);
  });
}

function roomSnapshot(room) {
  return {
    code: room.code,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    messageCount: room.messages.length,
  };
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function isRoomCode(value) {
  return typeof value === "string" && /^\d{8}$/.test(value);
}

function getRoom(code) {
  const room = rooms.get(code);
  if (room) room.updatedAt = now();
  return room;
}

function createRoom(code) {
  const room = {
    code,
    createdAt: now(),
    updatedAt: now(),
    nextMessageId: 1,
    messages: [],
  };
  rooms.set(code, room);
  return room;
}

async function handleRequest(req, res) {
  cleanRooms();

  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, { ok: true, rooms: rooms.size });
  }

  if (req.method === "POST" && url.pathname === "/rooms") {
    const body = await readJson(req);
    if (!isRoomCode(body.code)) {
      return sendJson(res, 400, { ok: false, error: "Room code must be 8 digits" });
    }
    if (rooms.has(body.code)) {
      return sendJson(res, 409, { ok: false, error: "Room already exists" });
    }
    return sendJson(res, 201, { ok: true, room: roomSnapshot(createRoom(body.code)) });
  }

  if (parts[0] === "rooms" && parts.length >= 2) {
    const code = parts[1];
    if (!isRoomCode(code)) {
      return sendJson(res, 400, { ok: false, error: "Room code must be 8 digits" });
    }

    const room = getRoom(code);
    if (!room) {
      return sendJson(res, 404, { ok: false, error: "Room not found" });
    }

    if (req.method === "GET" && parts.length === 2) {
      return sendJson(res, 200, { ok: true, room: roomSnapshot(room) });
    }

    if (req.method === "POST" && parts[2] === "messages") {
      const body = await readJson(req);
      if (!["host", "join"].includes(body.from) || !["host", "join"].includes(body.to)) {
        return sendJson(res, 400, { ok: false, error: "Message must include from and to roles" });
      }
      if (body.from === body.to) {
        return sendJson(res, 400, { ok: false, error: "Message roles must be different" });
      }
      const message = {
        id: room.nextMessageId,
        from: body.from,
        to: body.to,
        type: String(body.type || "signal").slice(0, 40),
        payload: body.payload ?? null,
        createdAt: now(),
      };
      room.nextMessageId += 1;
      room.updatedAt = now();
      room.messages.push(message);
      if (room.messages.length > 100) room.messages.splice(0, room.messages.length - 100);
      return sendJson(res, 201, { ok: true, message });
    }

    if (req.method === "GET" && parts[2] === "messages") {
      const to = url.searchParams.get("to");
      const since = Number(url.searchParams.get("since") || 0);
      if (!["host", "join"].includes(to)) {
        return sendJson(res, 400, { ok: false, error: "Query must include to=host or to=join" });
      }
      const messages = room.messages.filter((message) => message.to === to && message.id > since);
      return sendJson(res, 200, { ok: true, messages });
    }
  }

  return sendJson(res, 404, { ok: false, error: "Not found" });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendJson(res, 500, { ok: false, error: error.message });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Signaling server running at http://localhost:${PORT}`);
});
