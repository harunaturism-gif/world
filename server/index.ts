import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {
  createSessionRpContext,
  getVerifiedWorldSession,
  isValidProofPayload,
  isValidWorldRpId,
} from './authSession.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });


app.use(express.json());


















// Session proofs use an RP signature without an action. Action-bound signatures
// belong to uniqueness proofs and must not influence this endpoint.
app.post('/api/auth/session-rp-context', (_req, res) => {
  const signingKey = process.env.WORLD_RP_SIGNING_KEY;
  const rpId = process.env.WORLD_RP_ID;

  if (!signingKey || !isValidWorldRpId(rpId)) {
    return res.status(500).json({ error: 'Server authentication is not configured' });
  }

  try {
    return res.json(createSessionRpContext(signingKey, rpId));
  } catch {
    console.error('Session RP context generation failed');
    return res.status(500).json({ error: 'Failed to create session RP context' });
  }
});

// Auth Bridge: World ID Verification
app.post('/api/auth/verify', async (req, res) => {
  const proof = req.body?.proof;

  if (!isValidProofPayload(proof)) {
    return res.status(400).json({ error: 'Invalid proof payload' });
  }

  const rpId = process.env.WORLD_RP_ID;
  if (!isValidWorldRpId(rpId)) {
    return res.status(500).json({ error: 'Server authentication is not configured' });
  }

  const controller = new AbortController();
  const verificationTimeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`https://developer.world.org/api/v4/verify/${rpId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(proof),
      signal: controller.signal,
    });

    if (!response.ok) {
      await response.body?.cancel();
      console.error(`World ID verification rejected with status ${response.status}`);
      return res.status(401).json({ error: 'Invalid proof rejected by verification server' });
    }

    const verifiedWorldSession = getVerifiedWorldSession(await response.json());
    if (!verifiedWorldSession) {
      return res.status(401).json({ error: 'World verification did not satisfy authentication requirements' });
    }

    const { sessionId, verification } = verifiedWorldSession;

    // SECURITY PHASE BOUNDARY: this compatibility response does not issue an
    // authenticated application session. The World session_id is temporarily
    // exposed as the user ID. This remains NO-GO for beta until app sessions exist.
    return res.json({
      verified: true,
      worldIdentity: {
        sessionId,
        verification,
      },
      user: {
        id: sessionId,
        username: `Human_${sessionId.slice(-6).toUpperCase()}`,
      },
    });
  } catch {
    if (controller.signal.aborted) {
      return res.status(504).json({ error: 'World verification timed out' });
    }

    console.error('World ID verification request failed');
    return res.status(502).json({ error: 'World verification service unavailable' });
  } finally {
    clearTimeout(verificationTimeout);
  }
});

const rooms = new Map<string, Map<string, { x: number, y: number, name: string }>>();

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: string | null = null;
  const playerId = crypto.randomUUID();
  let playerName = `Human_${playerId.substring(0, 4)}`;

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'join') {
        const { roomId, name } = data;
        currentRoom = roomId;
        if (name) playerName = name;

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Map());
        }

        // Spawn slightly randomized position
        const spawnX = (Math.random() - 0.5) * 200;
        const spawnY = (Math.random() - 0.5) * 200;

        rooms.get(roomId)!.set(playerId, { x: spawnX, y: spawnY, name: playerName });

        // Send current state to new player
        const roomState = Array.from(rooms.get(roomId)!.entries()).map(([id, state]) => ({
          id, ...state
        }));

        ws.send(JSON.stringify({
          type: 'init',
          id: playerId,
          state: roomState
        }));

        // Broadcast join to others
        broadcast(roomId, {
          type: 'join',
          id: playerId,
          x: spawnX,
          y: spawnY,
          name: playerName
        }, playerId);
      }

      if (data.type === 'move' && currentRoom) {
        const room = rooms.get(currentRoom);
        if (room && room.has(playerId)) {
          const playerState = room.get(playerId)!;
          playerState.x = data.x;
          playerState.y = data.y;

          broadcast(currentRoom, {
            type: 'move',
            id: playerId,
            x: data.x,
            y: data.y
          }, playerId);
        }
      }

      if (data.type === 'chat' && currentRoom) {
        broadcast(currentRoom, {
          type: 'chat',
          id: playerId,
          name: playerName,
          text: data.text
        }); // Broadcast to everyone including sender for echo confirmation
      }

    } catch (e) {
      console.error('Invalid message format', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom)!.delete(playerId);
      broadcast(currentRoom, {
        type: 'leave',
        id: playerId
      });
      if (rooms.get(currentRoom)!.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });

  function broadcast(roomId: string, message: any, excludeId: string | null = null) {
    const messageStr = JSON.stringify(message);
    wss.clients.forEach((client) => {
      // We don't have a reliable mapping of client -> playerId in this simple setup without attaching it to the client object
      // So we attach it when they join.
      const clientPlayerId = (client as any).playerId;
      if (client.readyState === WebSocket.OPEN && clientPlayerId !== excludeId && (client as any).roomId === roomId) {
        client.send(messageStr);
      }
    });
  }

  // Attach metadata to client for broadcasting filtering
  (ws as any).playerId = playerId;
  // Monkeypatch the join handler to set roomId on the socket
  const originalOnMessage = ws.listeners('message')[0] as Function;
  ws.removeAllListeners('message');
  ws.on('message', (msg: string) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'join') {
        (ws as any).roomId = data.roomId;
      }
    } catch(e) {}
    originalOnMessage(msg);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Human World Multiplayer Server running on port ${PORT}`);
});
