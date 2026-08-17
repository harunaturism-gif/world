import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import http from 'http';
import crypto from 'crypto';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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
