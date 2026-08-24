export declare const APP_SESSION_ISSUER = "human-world-server";
export declare const APP_SESSION_AUDIENCE = "human-world-web";
export declare const APP_SESSION_LIFETIME_SECONDS: number;
export declare const PRODUCTION_SESSION_COOKIE = "__Host-human_world_session";
export declare const DEVELOPMENT_SESSION_COOKIE = "human_world_session_dev";
export interface InternalUser {
    id: string;
    username: string;
}
export interface AppSessionConfig {
    appOrigin: string;
    identitySecret: string;
    isProduction: boolean;
    sessionSecret: string;
}
interface TokenOptions {
    jti?: string;
    lifetimeSeconds?: number;
    now?: number;
}
export declare function isValidApplicationSecret(value: unknown): value is string;
export declare function isValidAppOrigin(value: unknown): value is string;
export declare function createAppSessionConfig(environment: Record<string, string | undefined>): AppSessionConfig | null;
export declare function deriveInternalUser(worldSessionId: string, identitySecret: string): InternalUser;
export declare function signApplicationSession(user: InternalUser, sessionSecret: string, options?: TokenOptions): string;
export declare function verifyApplicationSession(token: string, sessionSecret: string, now?: number): InternalUser | null;
export declare function getSessionCookieName(isProduction: boolean): "__Host-human_world_session" | "human_world_session_dev";
export declare function serializeSessionCookie(token: string, isProduction: boolean): string;
export declare function serializeLogoutCookie(isProduction: boolean): string;
export declare function extractSessionToken(cookieHeader: string | undefined, isProduction: boolean): string | null;
export declare function createSanitizedAuthResponse(user: InternalUser): {
    verified: true;
    user: {
        id: string;
        username: string;
    };
};
export declare function isExpectedBrowserOrigin(origin: string | undefined, appOrigin: string): boolean;
export {};
//# sourceMappingURL=appSession.d.ts.map