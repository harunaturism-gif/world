import { type RpSignature } from '@worldcoin/idkit-core/signing';
type SessionSigner = (params: {
    signingKeyHex: string;
}) => RpSignature;
export interface SessionRpContext {
    sig: string;
    nonce: string;
    created_at: number;
    expires_at: number;
    rp_id: string;
}
export interface VerifiedWorldSession {
    sessionId: string;
    verification: 'proof_of_human';
}
export declare function isValidWorldRpId(value: unknown): value is string;
export declare function isValidProofPayload(value: unknown): value is Record<string, unknown>;
export declare function createSessionRpContext(signingKeyHex: string, rpId: string, signer?: SessionSigner): SessionRpContext;
export declare function getVerifiedWorldSession(value: unknown): VerifiedWorldSession | null;
export {};
//# sourceMappingURL=authSession.d.ts.map