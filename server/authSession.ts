import { signRequest, type RpSignature } from '@worldcoin/idkit-core/signing';

const SESSION_ID_PATTERN = /^session_[0-9a-fA-F]{128}$/;

type SessionSigner = (params: { signingKeyHex: string }) => RpSignature;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isValidWorldRpId(value: unknown): value is string {
  return typeof value === 'string'
    && value === value.trim()
    && value.startsWith('rp_')
    && value.length > 3;
}

export function isValidProofPayload(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}

export function createSessionRpContext(
  signingKeyHex: string,
  rpId: string,
  signer: SessionSigner = signRequest,
): SessionRpContext {
  if (!signingKeyHex || !isValidWorldRpId(rpId)) {
    throw new Error('Invalid World ID server configuration');
  }

  // Session proofs must omit action. Supplying one changes the signed message
  // and is reserved for action-scoped uniqueness proofs.
  const { sig, nonce, createdAt, expiresAt } = signer({ signingKeyHex });

  return {
    sig,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
    rp_id: rpId,
  };
}

export function getVerifiedWorldSession(value: unknown): VerifiedWorldSession | null {
  if (!isRecord(value)) return null;
  if (value.success !== true || value.environment !== 'production') return null;
  if (!Array.isArray(value.results)) return null;
  if (typeof value.session_id !== 'string' || !SESSION_ID_PATTERN.test(value.session_id)) return null;

  const hasProofOfHuman = value.results.some((result) => (
    isRecord(result)
    && result.identifier === 'proof_of_human'
    && result.success === true
  ));

  if (!hasProofOfHuman) return null;

  return {
    sessionId: value.session_id,
    verification: 'proof_of_human',
  };
}
