import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const RELAY_SHARED_TOKEN = process.env.RELAY_SHARED_TOKEN || 'change-this-token';

const peersBySession = new Map();

function getSession(sessionId) {
  if (!peersBySession.has(sessionId)) {
    peersBySession.set(sessionId, { agent: null, relay: null });
  }
  return peersBySession.get(sessionId);
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, sessions: peersBySession.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const role = url.searchParams.get('role');
  const sessionId = url.searchParams.get('sessionId');
  const token = url.searchParams.get('token');

  if (!sessionId || (role !== 'agent' && role !== 'relay')) {
    socket.close(1008, 'invalid_params');
    return;
  }

  if (token !== RELAY_SHARED_TOKEN) {
    socket.close(1008, 'invalid_token');
    return;
  }

  const session = getSession(sessionId);
  if (role === 'agent') session.agent = socket;
  if (role === 'relay') session.relay = socket;

  socket.on('message', (data) => {
    const live = peersBySession.get(sessionId);
    if (!live) return;
    const peer = role === 'agent' ? live.relay : live.agent;
    if (peer && peer.readyState === peer.OPEN) {
      peer.send(data.toString());
    }
  });

  socket.on('close', () => {
    const live = peersBySession.get(sessionId);
    if (!live) return;
    if (role === 'agent' && live.agent === socket) live.agent = null;
    if (role === 'relay' && live.relay === socket) live.relay = null;
    if (!live.agent && !live.relay) peersBySession.delete(sessionId);
  });
});

server.listen(PORT, () => {
  console.log(`[relay] ws://localhost:${PORT}`);
});
