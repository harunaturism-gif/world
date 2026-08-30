import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createSessionRpContext, getVerifiedWorldSession, isValidProofPayload, isValidWorldRpId, } from './authSession.js';
import { createAppSessionConfig, createSanitizedAuthResponse, deriveInternalUser, extractSessionToken, isExpectedBrowserOrigin, serializeLogoutCookie, serializeSessionCookie, verifyApplicationSession, } from './appSession.js';
import { createAdminConfig, shouldBootstrapOwner } from './adminAuthorization.js';
import { createAuthRateLimitMiddleware } from './authRateLimit.js';
import { createAdminRouter } from './adminRoutes.js';
import { DevelopmentAdminRepository } from './developmentAdminRepository.js';
import { createSupabaseAdminRepository } from './supabaseAdminRepository.js';
import { AuthenticatedMultiplayerState, MAX_WEBSOCKET_PAYLOAD_BYTES, WebSocketMessageRateLimiter, attachWebSocketAuthentication, authenticateWebSocketUpgrade, getWebSocketAuthentication, parseClientWebSocketMessage, } from './webSocketSession.js';
import { FixedWindowRateLimiter, parseTrustedProxyHops } from './rateLimit.js';
import { createPersistenceConfig, issuePersistedApplicationSession } from './persistence.js';
import { createPersistenceRouter } from './persistenceRoutes.js';
import { createSupabasePersistenceRepository, DevelopmentMemoryPersistenceRepository, } from './supabasePersistence.js';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({
    maxPayload: MAX_WEBSOCKET_PAYLOAD_BYTES,
    noServer: true,
    perMessageDeflate: false,
});
const trustedProxyHops = parseTrustedProxyHops(process.env.TRUST_PROXY_HOPS);
if (trustedProxyHops === null)
    throw new Error('Invalid trusted-proxy configuration');
app.set('trust proxy', trustedProxyHops);
const appSessionConfig = createAppSessionConfig(process.env);
if (!appSessionConfig && process.env.NODE_ENV !== 'development') {
    throw new Error('Invalid application-session server configuration');
}
const persistenceConfig = createPersistenceConfig(process.env);
if (!persistenceConfig && process.env.NODE_ENV !== 'development') {
    throw new Error('Invalid persistence server configuration');
}
const adminConfig = createAdminConfig(process.env);
if (!adminConfig)
    throw new Error('Invalid admin authorization server configuration');
let persistenceRepository = null;
let adminRepository = null;
if (persistenceConfig?.mode === 'supabase') {
    persistenceRepository = createSupabasePersistenceRepository(persistenceConfig);
    adminRepository = createSupabaseAdminRepository(persistenceConfig);
}
else if (persistenceConfig?.mode === 'development-mock') {
    persistenceRepository = new DevelopmentMemoryPersistenceRepository();
    adminRepository = new DevelopmentAdminRepository();
}
function rejectWebSocketUpgrade(socket, statusCode) {
    const statusText = statusCode === 400
        ? 'Bad Request'
        : statusCode === 401
            ? 'Unauthorized'
            : statusCode === 403
                ? 'Forbidden'
                : 'Service Unavailable';
    if (socket.writable) {
        socket.write(`HTTP/1.1 ${statusCode} ${statusText}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    }
    socket.destroy();
}
server.on('upgrade', (request, socket, head) => {
    const result = authenticateWebSocketUpgrade({
        config: appSessionConfig,
        cookieHeader: request.headers.cookie,
        originHeader: request.headers.origin,
        protocolHeader: request.headers['sec-websocket-protocol'],
        requestTarget: request.url,
    });
    if (!result.accepted) {
        rejectWebSocketUpgrade(socket, result.statusCode);
        return;
    }
    try {
        wss.handleUpgrade(request, socket, head, (webSocket) => {
            const authenticatedSocket = attachWebSocketAuthentication(webSocket, result.authentication);
            wss.emit('connection', authenticatedSocket, request);
        });
    }
    catch {
        socket.destroy();
    }
});
app.use((req, res, next) => {
    const isAuthRequest = req.path.startsWith('/api/auth');
    if (isAuthRequest)
        res.setHeader('Cache-Control', 'no-store');
    const requestOrigin = req.headers.origin;
    if (appSessionConfig)
        res.setHeader('Vary', 'Origin');
    if (appSessionConfig && requestOrigin === appSessionConfig.appOrigin) {
        res.setHeader('Access-Control-Allow-Origin', appSessionConfig.appOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (isAuthRequest && req.method === 'OPTIONS') {
        if (!appSessionConfig) {
            return res.status(500).json({ error: 'Server authentication is not configured' });
        }
        if (requestOrigin !== appSessionConfig.appOrigin) {
            return res.status(403).json({ error: 'Origin not allowed' });
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(204).end();
    }
    return next();
});
app.use('/api/auth', (req, res, next) => {
    if (!appSessionConfig) {
        return res.status(500).json({ error: 'Server authentication is not configured' });
    }
    if (!isExpectedBrowserOrigin(req.headers.origin, appSessionConfig.appOrigin)) {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    return next();
});
const sessionContextRateLimiter = new FixedWindowRateLimiter({ limit: 10, windowMs: 60_000 });
const worldVerificationRateLimiter = new FixedWindowRateLimiter({ limit: 5, windowMs: 60_000 });
app.use('/api/auth/session-rp-context', createAuthRateLimitMiddleware(sessionContextRateLimiter));
app.use('/api/auth/verify', createAuthRateLimitMiddleware(worldVerificationRateLimiter));
app.use('/api/auth', express.json({ limit: '16kb', strict: true }));
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
    }
    catch {
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
        if (!appSessionConfig) {
            return res.status(500).json({ error: 'Server authentication is not configured' });
        }
        const user = deriveInternalUser(verifiedWorldSession.sessionId, appSessionConfig.identitySecret);
        if (!persistenceRepository) {
            return res.status(503).json({ error: 'Persistence service unavailable' });
        }
        try {
            const applicationToken = await issuePersistedApplicationSession(persistenceRepository, user, appSessionConfig.sessionSecret);
            if (shouldBootstrapOwner(adminConfig, user.id)) {
                if (!adminRepository)
                    throw new Error('Admin persistence unavailable');
                await adminRepository.ensureBootstrapOwner(user.id);
            }
            res.setHeader('Set-Cookie', serializeSessionCookie(applicationToken, appSessionConfig.isProduction));
            return res.json(createSanitizedAuthResponse(user));
        }
        catch {
            console.error('Verified profile persistence failed');
            return res.status(503).json({ error: 'Persistence service unavailable' });
        }
    }
    catch {
        if (controller.signal.aborted) {
            return res.status(504).json({ error: 'World verification timed out' });
        }
        console.error('World ID verification request failed');
        return res.status(502).json({ error: 'World verification service unavailable' });
    }
    finally {
        clearTimeout(verificationTimeout);
    }
});
app.get('/api/auth/session', (req, res) => {
    if (!appSessionConfig) {
        return res.status(500).json({ error: 'Server authentication is not configured' });
    }
    const token = extractSessionToken(req.headers.cookie, appSessionConfig.isProduction);
    const user = token ? verifyApplicationSession(token, appSessionConfig.sessionSecret) : null;
    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    return res.json({ authenticated: true, user });
});
app.post('/api/auth/logout', (_req, res) => {
    if (!appSessionConfig) {
        return res.status(500).json({ error: 'Server authentication is not configured' });
    }
    res.setHeader('Set-Cookie', serializeLogoutCookie(appSessionConfig.isProduction));
    return res.json({ success: true });
});
app.use('/api/persistence', createPersistenceRouter({
    appSessionConfig,
    publishedRooms: adminRepository,
    repository: persistenceRepository,
}));
app.use('/api/admin', createAdminRouter({
    appSessionConfig,
    repository: adminRepository,
}));
app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError || (typeof error === 'object' && error !== null && 'type' in error)) {
        return response.status(400).json({ error: 'Invalid request body' });
    }
    return response.status(500).json({ error: 'Request failed' });
});
const multiplayerState = new AuthenticatedMultiplayerState();
const webSocketMessageRateLimiter = new WebSocketMessageRateLimiter();
function sendWebSocketMessage(socket, message) {
    if (socket.readyState !== WebSocket.OPEN)
        return;
    if (socket.bufferedAmount > MAX_WEBSOCKET_PAYLOAD_BYTES * 4) {
        socket.close(1013, 'Connection overloaded');
        return;
    }
    try {
        socket.send(JSON.stringify(message));
    }
    catch {
        socket.close(1011, 'Send failed');
    }
}
function broadcastToRoom(roomId, message, excludeConnectionId = null) {
    for (const connection of multiplayerState.getConnectionsInRoom(roomId)) {
        if (connection.connectionId !== excludeConnectionId) {
            sendWebSocketMessage(connection.socket, message);
        }
    }
}
wss.on('connection', (ws) => {
    const authentication = getWebSocketAuthentication(ws);
    if (!authentication) {
        ws.close(1008, 'Authentication required');
        return;
    }
    const registration = multiplayerState.register(ws, authentication);
    const { connection, replaced, departedRoomId } = registration;
    if (departedRoomId) {
        broadcastToRoom(departedRoomId, {
            type: 'leave',
            id: authentication.user.id,
        });
    }
    if (replaced && (replaced.socket.readyState === WebSocket.OPEN || replaced.socket.readyState === WebSocket.CONNECTING)) {
        replaced.socket.close(4001, 'Session replaced');
    }
    ws.on('message', (rawMessage, isBinary) => {
        if (!multiplayerState.isCurrent(connection)) {
            ws.close(4001, 'Session replaced');
            return;
        }
        if (isBinary) {
            ws.close(1003, 'Text messages required');
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(rawMessage.toString());
        }
        catch {
            ws.close(1007, 'Invalid message');
            return;
        }
        const message = parseClientWebSocketMessage(parsed);
        if (!message) {
            ws.close(1008, 'Invalid message');
            return;
        }
        const rateLimitDecision = webSocketMessageRateLimiter.consume(authentication.user.id, message.type);
        if (!rateLimitDecision.allowed) {
            ws.close(1008, 'Rate limit exceeded');
            return;
        }
        if (message.type === 'join') {
            const spawnX = (Math.random() - 0.5) * 200;
            const spawnY = (Math.random() - 0.5) * 200;
            const joined = multiplayerState.join(connection, message.roomId, spawnX, spawnY);
            if (!joined) {
                ws.close(1008, 'Invalid room state');
                return;
            }
            if (joined.departedRoomId) {
                broadcastToRoom(joined.departedRoomId, {
                    type: 'leave',
                    id: authentication.user.id,
                });
            }
            sendWebSocketMessage(ws, {
                type: 'init',
                id: authentication.user.id,
                state: joined.roomState,
            });
            broadcastToRoom(message.roomId, {
                type: 'join',
                id: joined.presence.id,
                name: joined.presence.name,
                x: joined.presence.x,
                y: joined.presence.y,
            }, connection.connectionId);
            return;
        }
        if (message.type === 'move') {
            const moved = multiplayerState.move(connection, message.x, message.y);
            if (!moved || !connection.currentRoom) {
                ws.close(1008, 'Invalid movement state');
                return;
            }
            broadcastToRoom(connection.currentRoom, {
                type: 'move',
                id: moved.id,
                x: moved.x,
                y: moved.y,
            }, connection.connectionId);
            return;
        }
        if (!connection.currentRoom) {
            ws.close(1008, 'Invalid chat state');
            return;
        }
        broadcastToRoom(connection.currentRoom, {
            type: 'chat',
            id: authentication.user.id,
            name: authentication.user.username,
            text: message.text,
        });
    });
    ws.on('close', () => {
        const disconnected = multiplayerState.disconnect(connection);
        if (disconnected.departedRoomId) {
            broadcastToRoom(disconnected.departedRoomId, {
                type: 'leave',
                id: authentication.user.id,
            });
        }
    });
    // Prevent transport errors from becoming uncaught process errors. The close
    // handler performs identity-safe cleanup when this socket actually closes.
    ws.on('error', () => { });
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Human World Multiplayer Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map