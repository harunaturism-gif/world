import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import http from 'http';
import crypto from 'crypto';
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
import jwt from 'jsonwebtoken';
import { signRequest } from '@worldcoin/idkit-core/signing';
app.use(express.json());
// RP Signature for IDKit initialization
app.post('/api/auth/rp-signature', async (req, res) => {
    try {
        const { action } = req.body;
        // In dev mode, if the RP_SIGNING_KEY is not available, return a mock
        if (!process.env.WORLD_RP_SIGNING_KEY) {
            console.log("Returning mock RP signature (Missing WORLD_RP_SIGNING_KEY)");
            return res.json({
                sig: "mock_sig",
                nonce: "mock_nonce",
                created_at: Math.floor(Date.now() / 1000),
                expires_at: Math.floor(Date.now() / 1000) + 3600
            });
        }
        const { sig, nonce, createdAt, expiresAt } = signRequest({
            signingKeyHex: process.env.WORLD_RP_SIGNING_KEY,
            action: action || "human-world-login",
        });
        return res.json({
            sig,
            nonce,
            created_at: createdAt,
            expires_at: expiresAt,
        });
    }
    catch (error) {
        console.error("RP Sign error", error);
        return res.status(500).json({ error: "Failed to sign request" });
    }
});
// Auth Bridge: World ID -> Supabase JWT
app.post('/api/auth/verify', async (req, res) => {
    const { proof } = req.body;
    if (!proof) {
        return res.status(400).json({ error: 'Missing proof' });
    }
    const rp_id = process.env.WORLD_RP_ID || "app_mock_rp_id";
    let isValid = false;
    let nullifier = null;
    // Development bypass if explicitly configured or missing real credentials
    if (process.env.NODE_ENV !== 'production' && (!process.env.WORLD_RP_ID || process.env.ENABLE_DEV_BYPASS === 'true')) {
        console.log("Using Development Authentication Bypass");
        isValid = true;
        nullifier = `dev_nullifier_${crypto.randomUUID().substring(0, 8)}`;
    }
    else {
        // Production Real Verification
        try {
            const response = await fetch(`https://developer.world.org/api/v4/verify/${rp_id}`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(proof),
            });
            if (response.ok) {
                const verifyData = await response.json();
                isValid = true;
                if (proof.responses && proof.responses.length > 0) {
                    nullifier = proof.responses[0].nullifier || proof.responses[0].session_nullifier?.[0];
                }
            }
            else {
                const err = await response.text();
                console.error("World ID verification failed:", err);
            }
        }
        catch (error) {
            console.error("World ID API connection error:", error);
        }
    }
    if (isValid && nullifier) {
        const userId = nullifier.toString();
        const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET || 'super-secret-mock-jwt-key-for-local-dev-only-12345';
        const payload = {
            aud: 'authenticated',
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24),
            sub: userId,
            role: 'authenticated'
        };
        const token = jwt.sign(payload, supabaseJwtSecret);
        return res.json({ token, user: { id: userId, username: `Human_${userId.substring(userId.length > 6 ? userId.length - 6 : 0).toUpperCase()}` } });
    }
    else {
        return res.status(401).json({ error: 'Invalid proof or missing nullifier' });
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