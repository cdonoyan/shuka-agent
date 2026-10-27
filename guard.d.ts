/**
 * shuka.guard — enforcement-point (PEP) typings. v2.2.0
 */
export interface GuardOptions {
  apiKey?: string;
  apiBase?: string;
  timeout?: number;
  /** 'deny' (default, fail-closed) or 'allow' */
  onError?: 'deny' | 'allow';
}

export interface AccessCheckParams {
  termsId?: string;
  handshakeId?: string;
  proofToken?: string;
  purpose?: string;
  accessorId?: string;
  record?: boolean;
}

export interface AccessVerdict {
  allowed: boolean;
  decision: 'allow' | 'deny';
  reason: string | null;
  terms_id?: string;
  handshake_id?: string;
  uses_remaining?: number | null;
  receipt_id?: string | null;
  verdict?: Record<string, unknown> & { signature: string };
  [key: string]: unknown;
}

export interface Guard {
  checkAccess(params: AccessCheckParams): Promise<AccessVerdict>;
  /** Express/Connect middleware factory */
  express(extract?: (req: unknown) => AccessCheckParams): (req: any, res: any, next: any) => Promise<void>;
  defaultExtract(req: unknown): AccessCheckParams;
}

export declare class ShukaGuardError extends Error {
  code: string;
  details: Record<string, unknown>;
}

export declare function createGuard(options?: GuardOptions): Guard;
