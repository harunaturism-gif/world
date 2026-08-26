import type { AdminRepository } from './adminAuthorization.js';
import type { AppSessionConfig } from './appSession.js';
import { type PersistenceRepository } from './persistence.js';
export declare function createPersistenceRouter(options: {
    appSessionConfig: AppSessionConfig | null;
    publishedRooms?: Pick<AdminRepository, 'getRoomLayout'> | null;
    repository: PersistenceRepository | null;
}): import("express-serve-static-core").Router;
//# sourceMappingURL=persistenceRoutes.d.ts.map