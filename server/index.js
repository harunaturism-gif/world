import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
import { signRequest } from '@worldcoin/idkit-core/signing';
app.use(express.json());
// RP Signature for IDKit initialization
app.post('/api/auth/rp-signature', async (req, res) => {
    try {
        const { action } = req.body;
        // Server strictly controls the action. It does NOT trust the client string.
        if (!process.env.WORLD_ID_ACTION) {
            return res.status(500).json({ error: "Server missing WORLD_ID_ACTION configuration" });
        }
        const expectedAction = process.env.WORLD_ID_ACTION;
        if (action !== expectedAction) {
            return res.status(400).json({ error: "Invalid action requested" });
        }
        if (!process.env.WORLD_RP_SIGNING_KEY) {
            return res.status(500).json({ error: "Server missing RP_SIGNING_KEY credentials" });
        }
        const rp_id = process.env.WORLD_RP_ID;
        if (!rp_id || !rp_id.startsWith("rp_")) {
            return res.status(500).json({ error: "Server missing or invalid WORLD_RP_ID configuration" });
        }
        const { sig, nonce, createdAt, expiresAt } = signRequest({
            signingKeyHex: process.env.WORLD_RP_SIGNING_KEY,
            action: expectedAction,
        });
        return res.json({
            sig,
            nonce,
            created_at: createdAt,
            expires_at: expiresAt,
            rp_id
        });
    }
    catch (error) {
        console.error("RP Sign error", error);
        return res.status(500).json({ error: "Failed to sign request" });
    }
});
// Auth Bridge: World ID Verification
app.post('/api/auth/verify', async (req, res) => {
    const { proof } = req.body;
    if (!proof) {
        return res.status(400).json({ error: 'Missing proof payload from client' });
    }
    const rp_id = process.env.WORLD_RP_ID;
    if (!rp_id) {
        return res.status(500).json({ error: 'Server missing WORLD_RP_ID credentials' });
    }
    try {
        const response = await fetch(`https://developer.world.org/api/v4/verify/${rp_id}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(proof),
        });
        if (response.ok) {
            const verifyData = await response.json();
            // Trust ONLY the verified World API response, never the client proof identity
            if (verifyData.success !== true || !verifyData.session_id) {
                console.error("Verification succeeded but no valid session_id returned by World API.");
                return res.status(400).json({ error: "Unusable verified payload structure. Missing session_id." });
            }
            const verifiedSessionId = verifyData.session_id;
            // Explicit Auth Response Contract
            return res.json({
                verified: true,
                worldIdentity: {
                    sessionId: verifiedSessionId,
                    verification: "proof_of_human" // Assumed constraint enforced during proof generation
                },
                user: {
                    id: verifiedSessionId, // Temporary mapped ID until database persistence
                    username: `Human_${verifiedSessionId.substring(verifiedSessionId.length > 6 ? verifiedSessionId.length - 6 : 0).toUpperCase()}`
                }
            });
        }
        else {
            const err = await response.text();
            console.error("World ID verification rejected by World API:", err);
            return res.status(401).json({ error: 'Invalid proof rejected by verification server' });
        }
    }
    catch (error) {
        console.error("World ID API connection error:", error);
        return res.status(500).json({ error: "Failed to connect to verification server" });
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