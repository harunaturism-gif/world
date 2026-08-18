import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import http from 'http';
import crypto from 'crypto';
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
import jwt from 'jsonwebtoken';
app.use(express.json());
// Auth Bridge: World ID -> Supabase JWT
app.post('/api/auth/verify', async (req, res) => {
    const { proof, nullifier_hash } = req.body;
    if (!proof) {
        return res.status(400).json({ error: 'Missing proof' });
    }
    // 1. In a real app, verify the proof against the World ID API here.
    // We mock a successful verification for now since we don't have the App ID configured.
    const isValid = true;
    if (isValid) {
        // 2. We use the nullifier_hash as the stable internal identity (canonical user ID)
        const userId = nullifier_hash || crypto.randomUUID();
        // 3. Sign a JWT that Supabase RLS will accept.
        // Must match VITE_SUPABASE_JWT_SECRET in production
        const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET || 'super-secret-mock-jwt-key-for-local-dev-only-12345';
        const payload = {
            aud: 'authenticated',
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 1 day
            sub: userId,
            role: 'authenticated'
        };
        const token = jwt.sign(payload, supabaseJwtSecret);
        return res.json({ token, user: { id: userId, username: `Human_${userId.substring(0, 6)}` } });
    }
    else {
        return res.status(401).json({ error: 'Invalid proof' });
    }
});
const rooms = new Map();
wss.on('connection', (ws) => {
    let currentRoom = null;
    const playerId = crypto.randomUUID();
    let playerName = `Human_${playerId.substring(0, 4)}`;
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'join') {
                const { roomId, name } = data;
                currentRoom = roomId;
                if (name)
                    playerName = name;
                if (!rooms.has(roomId)) {
                    rooms.set(roomId, new Map());
                }
                // Spawn slightly randomized position
                const spawnX = (Math.random() - 0.5) * 200;
                const spawnY = (Math.random() - 0.5) * 200;
                rooms.get(roomId).set(playerId, { x: spawnX, y: spawnY, name: playerName });
                // Send current state to new player
                const roomState = Array.from(rooms.get(roomId).entries()).map(([id, state]) => ({
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
                    const playerState = room.get(playerId);
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
        }
        catch (e) {
            console.error('Invalid message format', e);
        }
    });
    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(playerId);
            broadcast(currentRoom, {
                type: 'leave',
                id: playerId
            });
            if (rooms.get(currentRoom).size === 0) {
                rooms.delete(currentRoom);
            }
        }
    });
    function broadcast(roomId, message, excludeId = null) {
        const messageStr = JSON.stringify(message);
        wss.clients.forEach((client) => {
            // We don't have a reliable mapping of client -> playerId in this simple setup without attaching it to the client object
            // So we attach it when they join.
            const clientPlayerId = client.playerId;
            if (client.readyState === WebSocket.OPEN && clientPlayerId !== excludeId && client.roomId === roomId) {
                client.send(messageStr);
            }
        });
    }
    // Attach metadata to client for broadcasting filtering
    ws.playerId = playerId;
    // Monkeypatch the join handler to set roomId on the socket
    const originalOnMessage = ws.listeners('message')[0];
    ws.removeAllListeners('message');
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            if (data.type === 'join') {
                ws.roomId = data.roomId;
            }
        }
        catch (e) { }
        originalOnMessage(msg);
    });
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Human World Multiplayer Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map