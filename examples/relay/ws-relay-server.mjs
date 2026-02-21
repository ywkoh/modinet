import crypto from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const RELAY_SHARED_TOKEN = process.env.RELAY_SHARED_TOKEN || "change-this-token";
const WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const peersBySession = new Map();

function getSession(sessionId) {
  if (!peersBySession.has(sessionId)) {
    peersBySession.set(sessionId, { agent: null, relay: null });
  }
  return peersBySession.get(sessionId);
}

function createWebSocketAccept(key) {
  return crypto.createHash("sha1").update(`${key}${WEBSOCKET_GUID}`).digest("base64");
}

function parseNextFrame(buffer) {
  if (buffer.length < 2) return null;

  const firstByte = buffer[0];
  const secondByte = buffer[1];
  const fin = (firstByte & 0x80) === 0x80;
  const opcode = firstByte & 0x0f;
  const masked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < offset + 2) return null;
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    if (buffer.length < offset + 8) return null;
    const big = buffer.readBigUInt64BE(offset);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("Frame too large");
    }
    payloadLength = Number(big);
    offset += 8;
  }

  let maskKey = null;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    maskKey = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + payloadLength) return null;

  const payload = Buffer.from(buffer.subarray(offset, offset + payloadLength));
  if (masked && maskKey) {
    for (let i = 0; i < payload.length; i += 1) {
      payload[i] ^= maskKey[i % 4];
    }
  }

  return {
    frame: { fin, opcode, payload },
    rest: buffer.subarray(offset + payloadLength),
  };
}

function encodeFrame(opcode, payload = Buffer.alloc(0)) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const bodyLength = body.length;
  let header;

  if (bodyLength < 126) {
    header = Buffer.alloc(2);
    header[1] = bodyLength;
  } else if (bodyLength <= 0xffff) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(bodyLength, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(bodyLength), 2);
  }

  header[0] = 0x80 | (opcode & 0x0f);
  return Buffer.concat([header, body]);
}

function encodeClosePayload(code, reason = "") {
  const reasonBuffer = Buffer.from(reason, "utf8");
  const payload = Buffer.alloc(2 + reasonBuffer.length);
  payload.writeUInt16BE(code, 0);
  reasonBuffer.copy(payload, 2);
  return payload;
}

function sendHttpError(socket, statusCode, message) {
  socket.write(
    `HTTP/1.1 ${statusCode}\r\n` +
      "Connection: close\r\n" +
      "Content-Type: text/plain; charset=utf-8\r\n" +
      `Content-Length: ${Buffer.byteLength(message)}\r\n` +
      "\r\n" +
      message,
  );
  socket.destroy();
}

function createRelaySocket(socket) {
  const handlers = {
    message: null,
    close: null,
  };
  let closed = false;
  let incomingBuffer = Buffer.alloc(0);

  const api = {
    onMessage(fn) {
      handlers.message = fn;
    },
    onClose(fn) {
      handlers.close = fn;
    },
    sendText(text) {
      if (closed) return;
      socket.write(encodeFrame(0x1, Buffer.from(String(text), "utf8")));
    },
    close(code = 1000, reason = "") {
      if (closed) return;
      closed = true;
      try {
        socket.write(encodeFrame(0x8, encodeClosePayload(code, reason)));
      } finally {
        socket.end();
      }
    },
  };

  function markClosed() {
    if (closed) return;
    closed = true;
    if (typeof handlers.close === "function") {
      handlers.close();
    }
  }

  socket.on("data", (chunk) => {
    incomingBuffer = Buffer.concat([incomingBuffer, chunk]);
    while (incomingBuffer.length > 0) {
      let parsed = null;
      try {
        parsed = parseNextFrame(incomingBuffer);
      } catch (_error) {
        api.close(1009, "frame_too_large");
        return;
      }
      if (!parsed) break;

      incomingBuffer = parsed.rest;
      const { fin, opcode, payload } = parsed.frame;
      if (!fin) {
        api.close(1003, "fragmented_not_supported");
        return;
      }

      if (opcode === 0x1) {
        if (typeof handlers.message === "function") {
          handlers.message(payload.toString("utf8"));
        }
      } else if (opcode === 0x8) {
        markClosed();
        socket.end();
        return;
      } else if (opcode === 0x9) {
        socket.write(encodeFrame(0xA, payload));
      }
    }
  });

  socket.on("close", () => {
    markClosed();
  });

  socket.on("error", () => {
    markClosed();
  });

  return api;
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, sessions: peersBySession.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.on("upgrade", (req, socket) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const requestUrl = new URL(req.url || "/", `http://${host}`);
  const role = requestUrl.searchParams.get("role");
  const sessionId = requestUrl.searchParams.get("sessionId");
  const token = requestUrl.searchParams.get("token");

  const wsKey = req.headers["sec-websocket-key"];
  if (
    !wsKey ||
    typeof wsKey !== "string" ||
    !sessionId ||
    (role !== "agent" && role !== "relay")
  ) {
    sendHttpError(socket, "400 Bad Request", "invalid_params");
    return;
  }

  if (token !== RELAY_SHARED_TOKEN) {
    sendHttpError(socket, "401 Unauthorized", "invalid_token");
    return;
  }

  const accept = createWebSocketAccept(wsKey);
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      "\r\n",
  );

  const relaySocket = createRelaySocket(socket);
  const session = getSession(sessionId);

  if (role === "agent") {
    if (session.agent) session.agent.close(1012, "replaced");
    session.agent = relaySocket;
  }
  if (role === "relay") {
    if (session.relay) session.relay.close(1012, "replaced");
    session.relay = relaySocket;
  }

  relaySocket.onMessage((text) => {
    const live = peersBySession.get(sessionId);
    if (!live) return;
    const peer = role === "agent" ? live.relay : live.agent;
    if (!peer) return;
    peer.sendText(text);
  });

  relaySocket.onClose(() => {
    const live = peersBySession.get(sessionId);
    if (!live) return;
    if (role === "agent" && live.agent === relaySocket) live.agent = null;
    if (role === "relay" && live.relay === relaySocket) live.relay = null;
    if (!live.agent && !live.relay) peersBySession.delete(sessionId);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[relay] ws://127.0.0.1:${PORT}`);
  console.log(`[relay] token=${RELAY_SHARED_TOKEN}`);
});
