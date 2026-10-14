/**
 * Shuka Client TypeScript Declarations
 * @packageDocumentation
 */

/** Handshake types supported by Shuka */
export declare const HandshakeType: {
  readonly LICENSE: 'license';
  readonly COMPLIANCE: 'compliance';
  readonly ATTESTATION: 'attestation';
  readonly COMPLIANCE_ATTESTATION: 'compliance_attestation';
  readonly ADMIN_COMPLIANCE: 'admin_compliance';
  readonly PARTNER_COMPLIANCE: 'partner_compliance';
  readonly RELEASE_OF_INFORMATION: 'release_of_information';
  readonly SESSION: 'session';
};

export type HandshakeTypeValue = typeof HandshakeType[keyof typeof HandshakeType];

/** Handshake status values */
export declare const HandshakeStatus: {
  readonly INITIATED: 'initiated';
  readonly ACTIVE: 'active';
  readonly VERIFIED: 'verified';
  readonly COMPLETED: 'completed';
  readonly FAILED: 'failed';
  readonly EXPIRED: 'expired';
  readonly PENDING: 'pending';
  readonly CHALLENGED: 'challenged';
  readonly RESPONDED: 'responded';
};

export type HandshakeStatusValue = typeof HandshakeStatus[keyof typeof HandshakeStatus];

/** Trust recommendation levels from agent negotiation */
export declare const TrustRecommendation: {
  readonly SAFE_TO_PROCEED: 'safe_to_proceed';
  readonly PROCEED_WITH_CAUTION: 'proceed_with_caution';
  readonly ADDITIONAL_VERIFICATION_RECOMMENDED: 'additional_verification_recommended';
  readonly DO_NOT_PROCEED: 'do_not_proceed';
};

export type TrustRecommendationValue = typeof TrustRecommendation[keyof typeof TrustRecommendation];

/** Industry contexts */
export declare const Industry: {
  readonly HEALTHCARE: 'healthcare';
  readonly CONSTRUCTION: 'construction';
  readonly FINANCE: 'finance';
  readonly LEGAL: 'legal';
  readonly GOVERNMENT: 'government';
  readonly GENERAL: 'general';
};

export type IndustryValue = typeof Industry[keyof typeof Industry];

/** Access types for terms and conditions */
export declare const AccessType: {
  readonly SINGLE_USE: 'single_use';
  readonly TIME_LIMITED: 'time_limited';
  readonly USE_LIMITED: 'use_limited';
  readonly PERPETUAL: 'perpetual';
  readonly SESSION_BOUND: 'session_bound';
  readonly WINDOWED: 'windowed';
};

export type AccessTypeValue = typeof AccessType[keyof typeof AccessType];

/** Terms status values */
export declare const TermsStatus: {
  readonly ACTIVE: 'active';
  readonly EXPIRED: 'expired';
  readonly EXHAUSTED: 'exhausted';
  readonly REVOKED: 'revoked';
  readonly SUSPENDED: 'suspended';
  readonly SUPERSEDED: 'superseded';
};

export type TermsStatusValue = typeof TermsStatus[keyof typeof TermsStatus];

/** Delegation levels for data stewardship */
export declare const DelegationLevel: {
  readonly OWNER: 'owner';
  readonly STEWARD: 'steward';
  readonly DELEGATE: 'delegate';
  readonly VIEWER: 'viewer';
};

export type DelegationLevelValue = typeof DelegationLevel[keyof typeof DelegationLevel];

/** Cache TTL values (in milliseconds) */
export declare const TTL: {
  readonly VERIFY_SUCCESS: number;
  readonly VERIFY_FAILURE: number;
  readonly CHAIN_OF_TRUST: number;
  readonly REGISTRY_LOOKUP: number;
  readonly INTEROP_CHECK: number;
  readonly STATUS: number;
  readonly USAGE_STATS: number;
  readonly TERMS: number;
};

/** Cache statistics */
export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: string;
}

/** LRU Cache with TTL support */
export declare class AttestationCache {
  constructor(maxSize?: number, defaultTTL?: number);
  get(key: string): any | null;
  set(key: string, data: any, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  readonly size: number;
  getStats(): CacheStats;
}

/** Request deduplication */
export declare class RequestDeduplicator {
  dedupe<T>(key: string, fn: () => Promise<T>): Promise<T>;
  readonly pendingCount: number;
}

/** Client error details */
export interface ShukaClientErrorDetails {
  status?: number;
  [key: string]: any;
}

/** Custom error class for Shuka client errors */
export declare class ShukaClientError extends Error {
  name: 'ShukaClientError';
  code: string;
  details: ShukaClientErrorDetails;
  constructor(message: string, code: string, details?: ShukaClientErrorDetails);
}

/** Client configuration options */
export interface ShukaClientConfig {
  apiKey?: string;
  apiBase?: string;
  agentId?: string;
  agentType?: string;
  timeout?: number;
  retries?: number;
}

/** Terms creation options */
export interface TermsOptions {
  accessType?: AccessTypeValue;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
  authorizedEntities?: string[];
  blockedEntities?: string[];
  permittedPurposes?: string[];
  prohibitedPurposes?: string[];
  purposeAttestationRequired?: boolean;
  allowDownstreamTransfer?: boolean;
  downstreamTermsInherit?: boolean;
  maxTransferDepth?: number;
  fieldAccessRules?: {
    visibleFields?: string[];
    redactedFields?: string[];
    summaryOnlyFields?: string[];
  };
  requireAccessReceipt?: boolean;
  notifyOnAccess?: boolean;
  webhookUrl?: string;
  price?: number;
  currency?: string;
  paymentRequired?: boolean;
  termsText?: string;
  requiresAcceptance?: boolean;
}

/** Terms details returned from getTerms */
export interface TermsResult {
  access_type: AccessTypeValue;
  status: TermsStatusValue;
  valid_from?: string;
  valid_until?: string;
  max_uses?: number;
  current_uses?: number;
  authorized_entities?: string[];
  blocked_entities?: string[];
  permitted_purposes?: string[];
  prohibited_purposes?: string[];
  allow_downstream_transfer?: boolean;
  requires_acceptance?: boolean;
  terms_text?: string;
  owner_id?: string;
  steward_id?: string;
  [key: string]: any;
}

/** Terms acceptance options */
export interface TermsAcceptanceOptions {
  purpose?: string;
  acceptorEntityId?: string;
  agreeToDownstreamRestrictions?: boolean;
  metadata?: Record<string, any>;
}

/** Terms acceptance result */
export interface TermsAcceptanceResult {
  accepted: boolean;
  receipt_id?: string;
  accepted_at?: string;
  terms_version?: number;
  [key: string]: any;
}

/** Access check options */
export interface AccessCheckOptions {
  accessorId?: string;
  purpose?: string;
}

/** Access check result */
export interface AccessCheckResult {
  permitted: boolean;
  reason?: string;
  warnings?: string[];
  terms_summary?: Record<string, any>;
  remaining_uses?: number;
  expires_at?: string;
}

/** Revocation options */
export interface RevocationOptions {
  reason?: string;
  revokedEntityId?: string;
}

/** Revocation result */
export interface RevocationResult {
  revoked: boolean;
  revoked_at?: string;
  affected_entities?: number;
  cascade_count?: number;
}

/** Terms update options */
export interface TermsUpdateOptions {
  accessType?: AccessTypeValue;
  validUntil?: string;
  maxUses?: number;
  authorizedEntities?: string[];
  blockedEntities?: string[];
  permittedPurposes?: string[];
  prohibitedPurposes?: string[];
  allowDownstreamTransfer?: boolean;
  termsText?: string;
}

/** Attestation creation options */
export interface AttestationOptions {
  handshakeType?: HandshakeTypeValue;
  industry?: IndustryValue | string;
  jurisdiction?: string;
  metadata?: Record<string, any>;
  aiContext?: Record<string, any>;
  terms?: TermsOptions;
}

/** Handshake creation data */
export interface CreateHandshakeData {
  handshakeType?: HandshakeTypeValue;
  entityId?: string;
  entityType?: string;
  verificationData?: Record<string, any>;
  teamId?: string;
  expiresInDays?: number;
  aiContext?: Record<string, any>;
  terms?: TermsOptions;
}

/** Attestation result */
export interface AttestationResult {
  success: boolean;
  proof_token?: string;
  handshake_id?: string;
  trust_score?: number;
  validation?: any;
  error?: string;
  [key: string]: any;
}

/** Verification result */
export interface VerificationResult {
  success?: boolean;
  verified?: boolean;
  trust_score?: number;
  handshake_id?: string;
  created_at?: string;
  error?: string;
  [key: string]: any;
}

/** Negotiation result */
export interface NegotiationResult {
  vouched: boolean;
  recommendation: TrustRecommendationValue;
  trust_score: number;
  evidence: Record<string, any>;
}

/** Registry discovery filters */
export interface DiscoveryFilters {
  industry?: string;
  compliance?: string;
  shakeType?: string;
  verifiedOnly?: boolean;
  page?: number;
  perPage?: number;
}

/** Registry entry */
export interface RegistryEntry {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  industry: string;
  trust_score: number;
  verified: boolean;
  status: string;
  [key: string]: any;
}

/** Discovery result */
export interface DiscoveryResult {
  registries: RegistryEntry[];
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
}

/** Interoperability check result */
export interface InteropResult {
  interoperable: boolean;
  reason?: string;
  issuer?: RegistryEntry;
  receiver?: RegistryEntry;
  shake_type?: string;
  requirements_met?: Record<string, boolean>;
}

/** Template filters */
export interface TemplateFilters {
  industry?: string;
  shakeType?: string;
  freeOnly?: boolean;
}

/** One Ring idempotent shake options */
export interface IdempotentShakeOptions {
  purpose?: string;
  industry?: string;
  handshakeType?: 'attestation' | 'verification' | 'transfer' | 'consent';
  expiresInDays?: number;
}

/** Marketplace license search filters */
export interface LicenseSearchFilters {
  q?: string;
  brand?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  perPage?: number;
}

/** Shake-anchored license offering parameters */
export interface LicenseOffering {
  anchorHandshakeId: string;
  brand: string;
  rightsHolder: string;
  validUntil: string;
  issueDate?: string;
  buyToOpenPrice?: number;
  permittedUses?: string[];
  prohibitedUses?: string[];
  maxGrants?: number;
  royaltyPercentage?: number;
  royaltyCapUsd?: number;
  platformFeePercentage?: number;
  imageUrl?: string;
}

/** License acquisition options */
export interface AcquireLicenseOptions {
  paymentMethod?: string;
}

/** Enterprise license browse filters */
export interface EnterpriseLicenseFilters {
  brand?: string;
  minSeats?: number;
  maxPrice?: number;
  page?: number;
  perPage?: number;
}

/** Enterprise license acquisition parameters */
export interface EnterpriseAcquisitionParams {
  licenseId: string | number;
  seatsNeeded: number;
}

/** SDK v1 terms definition (rules layer on immutable handshakes) */
export interface SdkTermsDefinition {
  accessType: AccessTypeValue;
  accessConfig?: Record<string, any>;
  permittedPurposes?: string[];
  prohibitedPurposes?: string[];
  geographicConstraints?: Record<string, any>;
  delegatePermissions?: Record<string, any>;
  extra?: Record<string, any>;
}

/** SDK v1 terms revocation options */
export interface SdkTermsRevokeOptions {
  /** REQUIRED by the backend (400 missing_revocation_reason without it) */
  reason: string;
}

/** SDK v1 terms access recording options */
export interface SdkTermsAccessOptions {
  accessorId?: string;
  purpose?: string;
}

/** Combined cache statistics */
export interface CombinedCacheStats {
  verify: CacheStats;
  chain: CacheStats;
  registry: CacheStats;
  interop: CacheStats;
  status: CacheStats;
  terms: CacheStats;
  pendingRequests: number;
}

/**
 * Shuka Client - Universal Trust Guardian for AI Agents
 */
export declare class ShukaClient {
  apiKey: string;
  apiBase: string;
  agentId: string;
  agentType: string;
  timeout: number;
  retries: number;

  constructor(config?: ShukaClientConfig);

  // Core operations
  request(endpoint: string, method?: string, body?: any): Promise<any>;
  createAttestation(description: string, options?: AttestationOptions): Promise<AttestationResult>;
  createHandshake(data: CreateHandshakeData): Promise<AttestationResult>;
  createSecureEnvelope(data: Record<string, any>): Promise<any>;
  createValidatedEnvelope(data: Record<string, any>): Promise<any>;

  // Verification (cached)
  verify(proofToken: string): Promise<VerificationResult>;
  getChainOfTrust(handshakeId: string): Promise<any>;
  generateProof(handshakeId: string): Promise<any>;
  verifyProof(token: string): Promise<VerificationResult>;

  // Agent negotiation
  negotiate(proofToken: string, purpose?: string): Promise<NegotiationResult>;

  // Receipt / Acknowledgment
  acknowledgeReceipt(envelopeId: string, options?: Record<string, any>): Promise<any>;
  getReceipts(handshakeId: string): Promise<any>;

  // Terms and conditions
  getTerms(handshakeId: string): Promise<TermsResult>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use recordTermsAccess(termsId, { purpose }). */
  acceptTerms(proofTokenOrHandshakeId?: string, options?: TermsAcceptanceOptions): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use getTerms(handshakeId) and inspect permitted_purposes. */
  checkAccess(proofTokenOrHandshakeId?: string, options?: AccessCheckOptions): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use revokeTermsById(termsId, { reason }). */
  revokeAccess(proofTokenOrHandshakeId?: string, options?: RevocationOptions): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use updateTermsById(termsId, updates). */
  updateTerms(proofTokenOrHandshakeId?: string, updates?: TermsUpdateOptions): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use getTermsRevisions(termsId). */
  getTermsHistory(proofTokenOrHandshakeId?: string): Promise<never>;
  /** @deprecated Never implemented server-side; throws NOT_SUPPORTED. Use getTermsReceipts(termsId). */
  getTermsAcceptors(proofTokenOrHandshakeId?: string): Promise<never>;

  // Registry discovery (cached)
  discoverRegistries(filters?: DiscoveryFilters): Promise<DiscoveryResult>;
  lookupRegistry(entityId: string): Promise<RegistryEntry>;
  canIssue(entityId: string, shakeType: string): Promise<any>;
  willAccept(entityId: string, shakeType: string, issuerId?: string): Promise<any>;
  checkInteroperability(issuerEntityId: string, receiverEntityId: string, shakeType: string): Promise<InteropResult>;
  getTemplates(filters?: TemplateFilters): Promise<any>;

  // One Ring idempotent shakes
  deriveEntityId(entityData: Record<string, any>): string;
  createIdempotentShake(entityType: string, entityData: Record<string, any>, options?: IdempotentShakeOptions): Promise<any>;
  lookupShake(entityType: string, entityData: Record<string, any>): Promise<any>;
  verifyShake(shakeId: string): Promise<VerificationResult>;

  // Marketplace — shake-anchored offerings and grants
  searchLicenses(filters?: LicenseSearchFilters): Promise<any>;
  getLicenseDetails(licenseId: string | number): Promise<any>;
  validateLicense(licenseId: string | number, context?: Record<string, any>): Promise<any>;
  issueLicense(offering: LicenseOffering): Promise<any>;
  acquireLicense(licenseId: string | number, paymentAmount: number, options?: AcquireLicenseOptions): Promise<any>;
  getPortfolio(): Promise<any>;
  verifyGrant(grantId: string): Promise<any>;
  getEntityHistory(entityType: string, entityId: string): Promise<any>;

  // Enterprise licensing
  getEnterpriseLicenses(filters?: EnterpriseLicenseFilters): Promise<any>;
  acquireEnterpriseLicense(params: EnterpriseAcquisitionParams): Promise<any>;

  // Rules layer — SDK v1 terms on immutable handshakes
  createTerms(handshakeId: string, terms: SdkTermsDefinition): Promise<any>;
  getTermsById(termsId: string): Promise<any>;
  updateTermsById(termsId: string, updates: Record<string, any>): Promise<any>;
  revokeTermsById(termsId: string, options?: SdkTermsRevokeOptions): Promise<any>;
  recordTermsAccess(termsId: string, options?: SdkTermsAccessOptions): Promise<any>;
  getTermsRevisions(termsId: string): Promise<any>;
  getTermsReceipts(termsId: string): Promise<any>;
  getHandshakeTermsV1(handshakeId: string): Promise<any>;

  // Status and usage
  getStatus(): Promise<any>;
  getUsageStats(): Promise<any>;
  getPricing(): Promise<any>;
  validateApiKey(): Promise<any>;

  // Cache management
  getCacheStats(): CombinedCacheStats;
  clearCache(): void;
  invalidate(proofToken: string): void;
}

/** Get the singleton client instance */
export declare function getClient(config?: ShukaClientConfig): ShukaClient;

/** Reset the singleton client */
export declare function resetClient(): void;
