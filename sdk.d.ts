/**
 * Shuka SDK TypeScript Declarations
 * @packageDocumentation
 */

import {
  ShukaClient,
  ShukaClientConfig,
  AttestationOptions,
  AttestationResult,
  VerificationResult,
  NegotiationResult,
  CombinedCacheStats,
  TermsResult,
  TermsAcceptanceOptions,
  TermsAcceptanceResult,
  AccessCheckOptions,
  AccessCheckResult,
  RevocationOptions,
  RevocationResult,
  TermsUpdateOptions,
  IdempotentShakeOptions,
  LicenseSearchFilters,
  LicenseOffering,
  AcquireLicenseOptions,
  EnterpriseLicenseFilters,
  EnterpriseAcquisitionParams,
  SdkTermsDefinition,
  SdkTermsRevokeOptions,
  SdkTermsAccessOptions,
  DiscoveryFilters,
  DiscoveryResult,
  RegistryEntry,
  InteropResult
} from './client';

/** SDK error details */
export interface ShukaSDKErrorDetails {
  docs?: string;
  [key: string]: any;
}

/** Custom error class for Shuka SDK errors */
export declare class ShukaSDKError extends Error {
  name: 'ShukaSDKError';
  code: string;
  details: ShukaSDKErrorDetails;
  constructor(message: string, code: string, details?: ShukaSDKErrorDetails);

  // The drawbridge (v2.2.0)
  accessCheck(params?: {
    termsId?: string; handshakeId?: string; proofToken?: string;
    purpose?: string; accessorId?: string; record?: boolean;
  }): Promise<any>;
  exchangeCrossingPass(options?: {
    expiresInSeconds?: number; permissions?: string[]; name?: string;
  }): Promise<any>;
  revokeGrant(grantId: string, reason?: string): Promise<any>;
  revokeShake(shakeId: string, reason?: string): Promise<any>;
}

/** SDK configuration options */
export interface ShukaSDKConfig extends ShukaClientConfig {
  agentName?: string;
}

/**
 * Main Shuka SDK class - Universal Trust Guardian
 */
export declare class ShukaSDK {
  client: ShukaClient;
  agentName: string;

  constructor(config?: ShukaSDKConfig);

  // Core attestation operations
  attest(description: string, options?: AttestationOptions): Promise<AttestationResult>;
  createAttestation(description: string, options?: AttestationOptions): Promise<AttestationResult>;
  createSecureEnvelope(data: Record<string, any>): Promise<any>;
  createValidatedEnvelope(data: Record<string, any>): Promise<any>;

  // Verification
  verify(proofToken: string): Promise<VerificationResult>;
  getChainOfTrust(handshakeId: string): Promise<any>;

  // Agent negotiation
  negotiate(proofToken: string, purpose?: string): Promise<NegotiationResult>;
  vouch(proofToken: string, purpose?: string): Promise<NegotiationResult>;

  // Receipt / Acknowledgment
  acknowledgeReceipt(envelopeId: string, options?: Record<string, any>): Promise<any>;

  // Terms and conditions
  getTerms(handshakeId: string): Promise<TermsResult>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use recordTermsAccess(termsId, { purpose }). */
  acceptTerms(proofToken?: string, options?: TermsAcceptanceOptions): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use getTerms(handshakeId). */
  checkAccess(proofToken?: string, options?: AccessCheckOptions): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use revokeTermsById(termsId, { reason }). */
  revokeAccess(proofToken?: string, options?: RevocationOptions): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use updateTermsById(termsId, updates). */
  updateTerms(proofToken?: string, updates?: TermsUpdateOptions): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use getTermsRevisions(termsId). */
  getTermsHistory(proofToken?: string): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use getTermsReceipts(termsId). */
  getTermsAcceptors(proofToken?: string): Promise<never>;

  // One Ring idempotent shakes
  shake(entityType: string, entityData: Record<string, any>, options?: IdempotentShakeOptions): Promise<any>;
  createIdempotentShake(entityType: string, entityData: Record<string, any>, options?: IdempotentShakeOptions): Promise<any>;
  lookupShake(entityType: string, entityData: Record<string, any>): Promise<any>;
  verifyShake(shakeId: string): Promise<VerificationResult>;

  // Marketplace — shake-anchored offerings and grants
  searchLicenses(filters?: LicenseSearchFilters): Promise<any>;
  getLicense(licenseId: string | number): Promise<any>;
  validateLicense(licenseId: string | number, context?: Record<string, any>): Promise<any>;
  issueLicense(offering: LicenseOffering): Promise<any>;
  purchaseLicense(licenseId: string | number, paymentAmount: number, options?: AcquireLicenseOptions): Promise<any>;
  acquireLicense(licenseId: string | number, paymentAmount: number, options?: AcquireLicenseOptions): Promise<any>;
  verifyGrant(grantId: string): Promise<any>;
  getPortfolio(): Promise<any>;
  getHistory(entityType: string, entityId: string): Promise<any>;

  // Enterprise licensing
  browseEnterpriseLicenses(filters?: EnterpriseLicenseFilters): Promise<any>;
  acquireEnterpriseSeats(params: EnterpriseAcquisitionParams): Promise<any>;

  // Rules layer — modifiable terms on immutable handshakes
  createTerms(handshakeId: string, terms: SdkTermsDefinition): Promise<any>;
  getTermsById(termsId: string): Promise<any>;
  amendTerms(termsId: string, updates: Record<string, any>): Promise<any>;
  revokeTermsById(termsId: string, options?: SdkTermsRevokeOptions): Promise<any>;
  recordAccess(termsId: string, options?: SdkTermsAccessOptions): Promise<any>;
  getTermsRevisions(termsId: string): Promise<any>;
  getTermsReceipts(termsId: string): Promise<any>;
  getHandshakeTerms(handshakeId: string): Promise<any>;

  // Registry discovery and interoperability
  discoverRegistries(filters?: DiscoveryFilters): Promise<DiscoveryResult>;
  lookupRegistry(entityId: string): Promise<RegistryEntry>;
  canIssue(entityId: string, shakeType: string): Promise<any>;
  willAccept(entityId: string, shakeType: string, issuerId: string): Promise<any>;
  checkInteroperability(issuerEntityId: string, receiverEntityId: string, shakeType: string): Promise<InteropResult>;

  // Status
  getStatus(): Promise<any>;
  getUsageStats(): Promise<any>;
  getPricing(): Promise<any>;

  // Cache management
  getCacheStats(): CombinedCacheStats;
  clearCache(): void;
  invalidate(proofToken: string): void;
}

/** Claude-formatted attestation result */
export interface ClaudeAttestationResult {
  success: boolean;
  proof_token?: string;
  handshake_id?: string;
  trust_score?: number;
  action: string;
  verify_url?: string | null;
}

/** Claude-formatted verification result */
export interface ClaudeVerificationResult {
  verification_result: 'VERIFIED' | 'NOT_VERIFIED';
  trust_score?: number;
  action: string;
  details: VerificationResult;
}

/** Claude-formatted negotiation result */
export interface ClaudeNegotiationResult {
  vouched: boolean;
  recommendation: string;
  trust_score: number;
  action: string;
  evidence: Record<string, any>;
}

/**
 * Claude-specific integration helper
 */
export declare class ClaudeIntegration extends ShukaSDK {
  constructor(config?: ShukaSDKConfig);
  attestForClaude(description: string, options?: AttestationOptions): Promise<ClaudeAttestationResult>;
  verifyForClaude(proofToken: string): Promise<ClaudeVerificationResult>;
  negotiateForClaude(proofToken: string, purpose?: string): Promise<ClaudeNegotiationResult>;
}

/** GPT-formatted attestation result */
export interface GPTAttestationResult {
  status: 'success' | 'error';
  data: {
    proof_token?: string;
    handshake_id?: string;
    trust_score?: number;
  };
  instructions: {
    action: string;
    message: string;
  };
}

/** GPT-formatted verification result */
export interface GPTVerificationResult {
  status: 'verified' | 'not_verified';
  data: {
    trust_score?: number;
    handshake_id?: string;
    created_at?: string;
  };
  instructions: {
    action: string;
    trust_level: 'high' | 'medium' | 'low';
  };
}

/** GPT-formatted negotiation result */
export interface GPTNegotiationResult {
  status: 'vouched' | 'not_vouched';
  data: {
    recommendation: string;
    trust_score: number;
    evidence: Record<string, any>;
  };
  instructions: {
    action: string;
    should_proceed: boolean;
  };
}

/**
 * ChatGPT/OpenAI-specific integration helper
 */
export declare class ChatGPTIntegration extends ShukaSDK {
  constructor(config?: ShukaSDKConfig);
  attestForGPT(description: string, options?: AttestationOptions): Promise<GPTAttestationResult>;
  verifyForGPT(proofToken: string): Promise<GPTVerificationResult>;
  negotiateForGPT(proofToken: string, purpose?: string): Promise<GPTNegotiationResult>;
}

/** Middleware verification result */
export interface MiddlewareVerifyResult {
  shouldProceed: boolean;
  recommendation: string;
  trustScore: number;
  vouched: boolean;
  evidence: Record<string, any>;
  raw: NegotiationResult;
}

/** Middleware attestation result */
export interface MiddlewareAttestResult {
  success: boolean;
  proofToken?: string;
  handshakeId?: string;
  trustScore?: number;
  raw: AttestationResult;
}

/**
 * Create verification middleware for incoming data
 */
export declare function createShukaMiddleware(
  config?: ShukaSDKConfig
): (proofToken: string, purpose?: string) => Promise<MiddlewareVerifyResult>;

/**
 * Create attestation middleware for outbound data
 */
export declare function createAttestationMiddleware(
  config?: ShukaSDKConfig
): (description: string, options?: AttestationOptions) => Promise<MiddlewareAttestResult>;
