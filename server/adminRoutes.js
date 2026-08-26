import express, {} from 'express';
import { AdminInvariantError, AdminVersionConflictError, authenticateAdminRequest, hasCapability, parsePublishRoomLayoutInput, parseResetRoomLayoutInput, parseRoleInput, parseRoomMetadataInput, } from './adminAuthorization.js';
import { isInternalUserId, isRoomId } from './persistence.js';
const requestContexts = new WeakMap();
function contextForRequest(request) {
    const context = requestContexts.get(request);
    if (!context)
        throw new Error('Missing admin request context');
    return context;
}
function adminFailure(response, error) {
    if (error instanceof AdminVersionConflictError)
        return response.status(409).json({ error: 'Version conflict' });
    if (error instanceof AdminInvariantError)
        return response.status(409).json({ error: 'Administrative invariant rejected' });
    return response.status(503).json({ error: 'Admin service unavailable' });
}
export function createAdminRouter(options) {
    const router = express.Router();
    router.options('{*path}', (request, response) => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Vary', 'Origin');
        if (!options.appSessionConfig || !options.repository)
            return response.status(503).json({ error: 'Admin service unavailable' });
        if (request.headers.origin !== options.appSessionConfig.appOrigin)
            return response.status(403).json({ error: 'Origin not allowed' });
        response.setHeader('Access-Control-Allow-Origin', options.appSessionConfig.appOrigin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        response.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, PUT, DELETE, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return response.status(204).end();
    });
    router.use(async (request, response, next) => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Vary', 'Origin');
        const result = await authenticateAdminRequest({
            appSessionConfig: options.appSessionConfig,
            repository: options.repository,
            cookieHeader: request.headers.cookie,
            originHeader: request.headers.origin,
        });
        if (!result.accepted) {
            const message = result.statusCode === 401
                ? 'Authentication required'
                : result.statusCode === 403 ? 'Admin access denied' : 'Admin service unavailable';
            return response.status(result.statusCode).json({ error: message });
        }
        response.setHeader('Access-Control-Allow-Origin', options.appSessionConfig.appOrigin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        requestContexts.set(request, Object.freeze({ user: result.user, session: result.session }));
        return next();
    });
    router.use(express.json({ limit: '256kb', strict: true }));
    const requireCapability = (capability) => (request, response, next) => {
        if (!hasCapability(contextForRequest(request).session, capability))
            return response.status(403).json({ error: 'Admin capability denied' });
        return next();
    };
    router.get('/session', (request, response) => {
        const { session } = contextForRequest(request);
        return response.json({ role: session.role, capabilities: session.capabilities });
    });
    router.get('/rooms', requireCapability('rooms:write'), async (_request, response) => {
        try {
            return response.json({ rooms: await options.repository.listRooms() });
        }
        catch (error) {
            return adminFailure(response, error);
        }
    });
    router.patch('/rooms/:roomId', requireCapability('rooms:write'), async (request, response) => {
        const roomId = request.params.roomId;
        const input = typeof roomId === 'string' ? parseRoomMetadataInput(request.body, roomId) : null;
        if (!input)
            return response.status(400).json({ error: 'Invalid room metadata' });
        try {
            return response.json({ room: await options.repository.updateRoomMetadata(contextForRequest(request).user.id, input) });
        }
        catch (error) {
            return adminFailure(response, error);
        }
    });
    router.get('/rooms/:roomId/layout', requireCapability('rooms:write'), async (request, response) => {
        if (!isRoomId(request.params.roomId))
            return response.status(400).json({ error: 'Invalid room ID' });
        try {
            return response.json({ published: await options.repository.getRoomLayout(request.params.roomId) });
        }
        catch (error) {
            return adminFailure(response, error);
        }
    });
    router.put('/rooms/:roomId/layout', requireCapability('rooms:write'), async (request, response) => {
        const roomId = request.params.roomId;
        const input = typeof roomId === 'string' ? parsePublishRoomLayoutInput(request.body, roomId) : null;
        if (!input)
            return response.status(400).json({ error: 'Invalid room layout' });
        try {
            return response.json({ published: await options.repository.publishRoomLayout(contextForRequest(request).user.id, input) });
        }
        catch (error) {
            return adminFailure(response, error);
        }
    });
    router.delete('/rooms/:roomId/layout', requireCapability('rooms:write'), async (request, response) => {
        const roomId = request.params.roomId;
        const input = typeof roomId === 'string' ? parseResetRoomLayoutInput(request.body, roomId) : null;
        if (!input)
            return response.status(400).json({ error: 'Invalid layout reset' });
        try {
            const version = await options.repository.resetRoomLayout(contextForRequest(request).user.id, input);
            return response.json({ reset: true, version });
        }
        catch (error) {
            return adminFailure(response, error);
        }
    });
    router.get('/roles', requireCapability('roles:manage'), async (_request, response) => {
        try {
            return response.json({ roles: await options.repository.listRoles() });
        }
        catch (error) {
            return adminFailure(response, error);
        }
    });
    router.put('/roles/:userId', requireCapability('roles:manage'), async (request, response) => {
        if (!isInternalUserId(request.params.userId))
            return response.status(400).json({ error: 'Invalid role assignment' });
        const role = parseRoleInput(request.body);
        if (!role)
            return response.status(400).json({ error: 'Invalid role assignment' });
        try {
            return response.json({ assignment: await options.repository.setRole(contextForRequest(request).user.id, request.params.userId, role) });
        }
        catch (error) {
            return adminFailure(response, error);
        }
    });
    router.delete('/roles/:userId', requireCapability('roles:manage'), async (request, response) => {
        if (!isInternalUserId(request.params.userId))
            return response.status(400).json({ error: 'Invalid role assignment' });
        if (request.body !== undefined && Object.keys(request.body).length > 0)
            return response.status(400).json({ error: 'Invalid role assignment' });
        try {
            await options.repository.deleteRole(contextForRequest(request).user.id, request.params.userId);
            return response.json({ removed: true });
        }
        catch (error) {
            return adminFailure(response, error);
        }
    });
    return router;
}
//# sourceMappingURL=adminRoutes.js.map