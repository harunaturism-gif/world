import express, { type Request, type Response } from 'express';
import type { AppSessionConfig, InternalUser } from './appSession.js';
import {
  authenticatePersistenceRequest,
  isInternalUserId,
  isUsername,
  parseAvatarAppearance,
  parseCreatePostInput,
  parseCreateRoomInput,
  parsePostId,
  type PersistenceRepository,
} from './persistence.js';

const authenticatedRequests = new WeakMap<Request, InternalUser>();

function userForRequest(request: Request): InternalUser {
  const user = authenticatedRequests.get(request);
  if (!user) throw new Error('Missing authenticated persistence context');
  return user;
}

function persistenceFailure(response: Response) {
  return response.status(503).json({ error: 'Persistence service unavailable' });
}

export function createPersistenceRouter(options: {
  appSessionConfig: AppSessionConfig | null;
  repository: PersistenceRepository | null;
}) {
  const router = express.Router();

  router.options('{*path}', (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Vary', 'Origin');
    if (!options.appSessionConfig || !options.repository) {
      return response.status(503).json({ error: 'Persistence service unavailable' });
    }
    if (request.headers.origin !== options.appSessionConfig.appOrigin) {
      return response.status(403).json({ error: 'Origin not allowed' });
    }
    response.setHeader('Access-Control-Allow-Origin', options.appSessionConfig.appOrigin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return response.status(204).end();
  });

  router.use((request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Vary', 'Origin');
    const result = authenticatePersistenceRequest({
      config: options.appSessionConfig,
      cookieHeader: request.headers.cookie,
      originHeader: request.headers.origin,
    });
    if (!result.accepted) {
      const error = result.statusCode === 401
        ? 'Authentication required'
        : result.statusCode === 403 ? 'Origin not allowed' : 'Persistence service unavailable';
      return response.status(result.statusCode).json({ error });
    }
    if (!options.repository) return persistenceFailure(response);
    response.setHeader('Access-Control-Allow-Origin', options.appSessionConfig!.appOrigin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    authenticatedRequests.set(request, result.user);
    return next();
  });

  router.get('/profiles/:username', async (request, response) => {
    if (!isUsername(request.params.username)) return response.status(400).json({ error: 'Invalid profile request' });
    try {
      const profile = await options.repository!.getProfileByUsername(request.params.username);
      return profile ? response.json({ profile }) : response.status(404).json({ error: 'Profile not found' });
    } catch { return persistenceFailure(response); }
  });

  router.get('/profiles/:userId/counts', async (request, response) => {
    if (!isInternalUserId(request.params.userId)) return response.status(400).json({ error: 'Invalid profile request' });
    try { return response.json(await options.repository!.getProfileCounts(request.params.userId)); }
    catch { return persistenceFailure(response); }
  });

  router.get('/follows/:targetId', async (request, response) => {
    if (!isInternalUserId(request.params.targetId)) return response.status(400).json({ error: 'Invalid follow request' });
    try { return response.json({ following: await options.repository!.isFollowing(userForRequest(request).id, request.params.targetId) }); }
    catch { return persistenceFailure(response); }
  });

  router.put('/follows/:targetId', async (request, response) => {
    const actor = userForRequest(request);
    if (!isInternalUserId(request.params.targetId) || request.params.targetId === actor.id) {
      return response.status(400).json({ error: 'Invalid follow request' });
    }
    try { return response.json({ following: await options.repository!.setFollowing(actor.id, request.params.targetId, true) }); }
    catch { return persistenceFailure(response); }
  });

  router.delete('/follows/:targetId', async (request, response) => {
    const actor = userForRequest(request);
    if (!isInternalUserId(request.params.targetId) || request.params.targetId === actor.id) {
      return response.status(400).json({ error: 'Invalid follow request' });
    }
    try { return response.json({ following: await options.repository!.setFollowing(actor.id, request.params.targetId, false) }); }
    catch { return persistenceFailure(response); }
  });

  router.get('/feed', async (_request, response) => {
    try { return response.json({ posts: await options.repository!.getFeed() }); }
    catch { return persistenceFailure(response); }
  });

  router.post('/posts', async (request, response) => {
    const input = parseCreatePostInput(request.body);
    if (!input) return response.status(400).json({ error: 'Invalid post' });
    try { return response.status(201).json({ post: await options.repository!.createPost(userForRequest(request), input) }); }
    catch { return persistenceFailure(response); }
  });

  router.put('/posts/:postId/like', async (request, response) => {
    const postId = parsePostId(request.params.postId);
    if (!postId || (request.body !== undefined && Object.keys(request.body as object).length > 0)) {
      return response.status(400).json({ error: 'Invalid like request' });
    }
    try { return response.json({ likes: await options.repository!.likePost(userForRequest(request).id, postId) }); }
    catch { return persistenceFailure(response); }
  });

  router.get('/rooms', async (_request, response) => {
    try { return response.json({ rooms: await options.repository!.listRooms() }); }
    catch { return persistenceFailure(response); }
  });

  router.post('/rooms', async (request, response) => {
    const input = parseCreateRoomInput(request.body);
    if (!input) return response.status(400).json({ error: 'Invalid room' });
    try { return response.status(201).json({ room: await options.repository!.createRoom(userForRequest(request), input) }); }
    catch { return persistenceFailure(response); }
  });

  router.get('/avatar', async (request, response) => {
    try { return response.json({ appearance: await options.repository!.getAvatar(userForRequest(request).id) }); }
    catch { return persistenceFailure(response); }
  });

  router.put('/avatar', async (request, response) => {
    const appearance = parseAvatarAppearance(request.body);
    if (!appearance) return response.status(400).json({ error: 'Invalid avatar' });
    try { return response.json({ appearance: await options.repository!.updateAvatar(userForRequest(request).id, appearance) }); }
    catch { return persistenceFailure(response); }
  });

  return router;
}
