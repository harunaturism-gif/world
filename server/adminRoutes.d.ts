import type { AppSessionConfig } from './appSession.js';
import { type AdminRepository } from './adminAuthorization.js';
export declare function createAdminRouter(options: {
    appSessionConfig: AppSessionConfig | null;
    repository: AdminRepository | null;
}): import("express-serve-static-core").Router;
//# sourceMappingURL=adminRoutes.d.ts.map