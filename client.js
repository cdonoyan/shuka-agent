/**
 * Shuka Client - The Universal Trust Guardian HTTP Client
 *
 * This is THE source of all Shuka API interactions for agents.
 * Built for the AI economy - every operation is designed for agent-to-agent trust.
 *
 * Features:
 * - Full lifecycle caching (verify, chain, registry lookups)
 * - Request deduplication (no redundant in-flight requests)
 * - All handshake types supported
 * - Registry discovery and interoperability checking
 * - Compact proof generation and verification
 * - Chain of trust tracking
 *
 * @author Auron
 * @version 2.1.1
 * @see https://shuka.app
 */

const crypto = require('crypto');

// Keep in sync with package.json — sent on every request so backend
// telemetry (SDKUsageLog.sdk_version/platform) can attribute traffic
const SDK_VERSION = '2.1.1';

// ===========================================================================
// ENUMS AND CONSTANTS
// ===========================================================================

/**
 * Handshake types supported by Shuka
 */
const HandshakeType = {
  LICENSE: 'license',
  COMPLIANCE: 'compliance',
  ATTESTATION: 'attestation',
  COMPLIANCE_ATTESTATION: 'compliance_attestation',
  ADMIN_COMPLIANCE: 'admin_compliance',
  PARTNER_COMPLIANCE: 'partner_compliance',
  RELEASE_OF_INFORMATION: 'release_of_information',
  SESSION: 'session'
};

/**
 * Handshake status values
 */
const HandshakeStatus = {
  INITIATED: 'initiated',
  ACTIVE: 'active',
  VERIFIED: 'verified',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
  PENDING: 'pending',
  CHALLENGED: 'challenged',
  RESPONDED: 'responded'
};

/**
 * Trust recommendation levels from agent negotiation
 */
const TrustRecommendation = {
  SAFE_TO_PROCEED: 'safe_to_proceed',
  PROCEED_WITH_CAUTION: 'proceed_with_caution',
  ADDITIONAL_VERIFICATION_RECOMMENDED: 'additional_verification_recommended',
  DO_NOT_PROCEED: 'do_not_proceed'
};

/**
 * Industry contexts
 */
const Industry = {
  HEALTHCARE: 'healthcare',
  CONSTRUCTION: 'construction',
  FINANCE: 'finance',
  LEGAL: 'legal',
  GOVERNMENT: 'government',
  GENERAL: 'general'
};

/**
 * Access types for terms and conditions
 * Defines how data can be accessed under the terms
 */
const AccessType = {
  SINGLE_USE: 'single_use',           // One-time access, then terms expire
  TIME_LIMITED: 'time_limited',       // Access valid for a time period
  USE_LIMITED: 'use_limited',         // Access valid for N uses
  PERPETUAL: 'perpetual',             // Unlimited access (rare, high trust)
  SESSION_BOUND: 'session_bound',     // Access tied to active session
  WINDOWED: 'windowed'                // Access only during specific time windows
};

/**
 * Terms status values
 * Lifecycle of access terms
 */
const TermsStatus = {
  ACTIVE: 'active',           // Terms are currently valid
  EXPIRED: 'expired',         // Time-based expiration
  EXHAUSTED: 'exhausted',     // Use count reached
  REVOKED: 'revoked',         // Manually revoked by owner
  SUSPENDED: 'suspended',     // Temporarily suspended
  SUPERSEDED: 'superseded'    // Replaced by newer terms
};

/**
 * Delegation levels for data stewardship
 * Who can do what with the data
 */
const DelegationLevel = {
  OWNER: 'owner',             // Full control, can revoke, transfer ownership
  STEWARD: 'steward',         // Can manage access, cannot transfer ownership
  DELEGATE: 'delegate',       // Can use and share within limits
  VIEWER: 'viewer'            // Read-only access
};

// Cache TTL constants
const TTL = {
  VERIFY_SUCCESS: 5 * 60 * 1000,      // 5 minutes for valid proofs
  VERIFY_FAILURE: 30 * 1000,           // 30 seconds for failures
  CHAIN_OF_TRUST: 10 * 60 * 1000,      // 10 minutes for chain data
  REGISTRY_LOOKUP: 15 * 60 * 1000,     // 15 minutes for registry lookups
  INTEROP_CHECK: 10 * 60 * 1000,       // 10 minutes for interop checks
  STATUS: 60 * 1000,                   // 1 minute for status
  USAGE_STATS: 2 * 60 * 1000,          // 2 minutes for usage stats
  TERMS: 5 * 60 * 1000                 // 5 minutes for terms data
};

// ===========================================================================
// LRU CACHE WITH TTL
// ===========================================================================

/**
 * LRU Cache with TTL support and hit/miss tracking
 */
class AttestationCache {
  constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.data;
  }

  set(key, data, ttl) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl ?? this.defaultTTL)
    });
  }

  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size() {
    return this.cache.size;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : '0%'
    };
  }
}

// ===========================================================================
// REQUEST DEDUPLICATION
// ===========================================================================

/**
 * Prevents duplicate in-flight requests
 */
class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  async dedupe(key, fn) {
    const existing = this.pending.get(key);
    if (existing) return existing;

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  get pendingCount() {
    return this.pending.size;
  }
}

// ===========================================================================
// ERROR CLASS
// ===========================================================================

/**
 * Custom error class for Shuka client errors
 */
class ShukaClientError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ShukaClientError';
    this.code = code;
    this.details = details;
  }
}

// ===========================================================================
// MAIN CLIENT CLASS
// ===========================================================================

/**
 * Shuka Client - Universal Trust Guardian for AI Agents
 *
 * The complete HTTP client for all Shuka operations.
 * Designed for agent-to-agent trust in the AI economy.
 */
class ShukaClient {
  /**
   * @param {Object} config - Configuration options
   * @param {string} [config.apiKey] - API key (or set SHUKA_API_KEY env var)
   * @param {string} [config.apiBase] - API base URL
   * @param {string} [config.agentId] - Your agent identifier for audit trails
   * @param {string} [config.agentType] - Agent type (claude, gpt-4, custom, etc.)
   * @param {number} [config.timeout] - Request timeout in ms (default: 10000)
   * @param {number} [config.retries] - Number of retries (default: 2)
   */
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.SHUKA_API_KEY || '';
    this.apiBase = config.apiBase || process.env.SHUKA_API_URL || 'https://auron-shuka.onrender.com/api';
    this.agentId = config.agentId || 'shuka-agent';
    this.agentType = config.agentType || 'sdk';
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 2;

    // Initialize caches for different operation types
    this.verifyCache = new AttestationCache(1000, TTL.VERIFY_SUCCESS);
    this.chainCache = new AttestationCache(500, TTL.CHAIN_OF_TRUST);
    this.registryCache = new AttestationCache(200, TTL.REGISTRY_LOOKUP);
    this.interopCache = new AttestationCache(200, TTL.INTEROP_CHECK);
    this.statusCache = new AttestationCache(10, TTL.STATUS);
    this.termsCache = new AttestationCache(500, TTL.TERMS);

    // Request deduplication
    this.deduplicator = new RequestDeduplicator();
  }

  /**
   * Get authentication headers
   */
  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': `ShukaAgent/${SDK_VERSION} (${this.agentId})`,
      'X-Agent-Id': this.agentId,
      'X-Agent-Type': this.agentType,
      'X-SDK-Version': SDK_VERSION,
      'X-SDK-Platform': 'node'
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
      headers['X-SDK-API-Key'] = this.apiKey;
    }
    return headers;
  }

  /**
   * Make an HTTP request with retry logic
   */
  async request(endpoint, method = 'GET', body = null) {
    const url = `${this.apiBase}${endpoint}`;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: this._getHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Authentication errors - don't retry
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          throw new ShukaClientError(
            errorData.message || 'Invalid API key',
            'INVALID_API_KEY',
            { status: 401, ...errorData }
          );
        }

        // Payment required - don't retry
        if (response.status === 402) {
          const errorData = await response.json().catch(() => ({}));
          throw new ShukaClientError(
            errorData.message || 'Payment required - add credits at shuka.app/partner/billing',
            'PAYMENT_REQUIRED',
            { status: 402, ...errorData }
          );
        }

        if (!response.ok) {
          const errorText = await response.text();
          const err = new Error(`Shuka API error (${response.status}): ${errorText}`);
          err.status = response.status;
          throw err;
        }

        return response.json();

      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof ShukaClientError) {
          throw error;
        }

        if (attempt === this.retries) {
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // ===========================================================================
  // CORE ATTESTATION OPERATIONS
  // ===========================================================================

  /**
   * Create an attestation (the Shuka Shake)
   *
   * NOTE: the /shake/quick endpoint reads only the attested text and the
   * terms object. Terms use the backend schema: access_type, validity_days,
   * require_receipt, permitted_purposes, prohibited_purposes (camelCase
   * aliases below are translated). Keyless calls are deprecated server-side;
   * pass an SDK key.
   *
   * @param {string} description - What you are attesting to
   * @param {Object} [options] - Attestation options
   * @param {Object} [options.terms] - Terms for data access
   * @param {string} [options.terms.accessType] - single_use|time_limited|use_limited|perpetual|session_bound|windowed
   * @param {number} [options.terms.validityDays] - Days the terms remain valid
   * @param {boolean} [options.terms.requireReceipt] - Require access receipts
   * @param {string[]} [options.terms.permittedPurposes] - What the data can be used for
   * @param {string[]} [options.terms.prohibitedPurposes] - What the data cannot be used for
   * @returns {Promise<Object>} Attestation result with proof_token
   */
  async createAttestation(description, options = {}) {
    const formData = new FormData();
    formData.append('text', description);

    if (options.terms) {
      const t = options.terms;
      const terms = {
        access_type: t.accessType ?? t.access_type,
        validity_days: t.validityDays ?? t.validity_days,
        require_receipt: t.requireReceipt ?? t.require_receipt,
        permitted_purposes: t.permittedPurposes ?? t.permitted_purposes,
        prohibited_purposes: t.prohibitedPurposes ?? t.prohibited_purposes
      };
      Object.keys(terms).forEach((k) => terms[k] === undefined && delete terms[k]);
      formData.append('terms', JSON.stringify(terms));
    }

    const headers = {
      'User-Agent': `ShukaAgent/${SDK_VERSION} (${this.agentId})`,
      'X-SDK-Version': SDK_VERSION,
      'X-SDK-Platform': 'node'
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
      headers['X-SDK-API-Key'] = this.apiKey;
      headers['X-Agent-Id'] = this.agentId;
      headers['X-Agent-Type'] = this.agentType;
    }

    const response = await fetch(`${this.apiBase}/shake/quick`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new ShukaClientError(
        `Failed to create attestation: ${await response.text()}`,
        'ATTESTATION_FAILED',
        { status: response.status }
      );
    }

    return response.json();
  }

  /**
   * Create a full handshake with detailed parameters
   *
   * @param {Object} data - Handshake parameters
   * @param {string} [data.handshakeType] - Type of handshake
   * @param {string} [data.entityId] - Entity identifier
   * @param {string} [data.entityType] - Type of entity
   * @param {Object} [data.verificationData] - Data to verify
   * @param {string} [data.teamId] - Team identifier
   * @param {number} [data.expiresInDays] - Days until expiration
   * @param {Object} [data.aiContext] - AI context for machine-readable responses
   * @returns {Promise<Object>} Handshake result
   *
   * NOTE: POST /api/handshake does not persist caller-supplied terms (older
   * releases sent a `terms` object that the backend silently discarded).
   * To attach rules, create the handshake first and then call
   * createTerms(handshakeId, terms).
   */
  async createHandshake(data) {
    if (data.terms) {
      process.emitWarning(
        'createHandshake({ terms }) is not persisted by the Shuka API and is ignored. ' +
        'Create the handshake, then call createTerms(handshakeId, terms).',
        'ShukaDeprecationWarning'
      );
    }

    const payload = {
      handshake_type: data.handshakeType || HandshakeType.ATTESTATION,
      entity_id: data.entityId,
      entity_type: data.entityType,
      verification_data: data.verificationData || {},
      team_id: data.teamId,
      expires_in_days: data.expiresInDays || 365,
      ai_context: {
        machine_readable: true,
        agent_id: this.agentId,
        agent_type: this.agentType,
        ...data.aiContext
      }
    };

    return this.request('/handshake', 'POST', payload);
  }

  /**
   * Create a secure envelope (hash-only notary mode)
   * Shuka never sees the plaintext - only the hash
   */
  async createSecureEnvelope(data) {
    return this.request('/handshake/secure-envelope', 'POST', data);
  }

  /**
   * Create a validated envelope (trust layer mode)
   * Shuka validates claims before attesting
   */
  async createValidatedEnvelope(data) {
    return this.request('/handshake/validated-envelope', 'POST', data);
  }

  // ===========================================================================
  // VERIFICATION OPERATIONS (CACHED)
  // ===========================================================================

  /**
   * Verify a proof token or envelope (CACHED) — free, no key required.
   *
   * Compact proof tokens (shk_v1.*) resolve via the proof registry:
   * GET /api/shake/proof/verify/{token} → { valid, proof, embed_format }.
   * Envelope IDs (ENV-*) resolve via the secure-envelope route:
   * GET /api/handshake/secure-envelope/{id} → { success, envelope }.
   *
   * @param {string} proofToken - The proof token (shk_v1.xxx.yyy) or envelope ID (ENV-xxx)
   * @returns {Promise<Object>} Verification result. For proof tokens: valid
   *   (boolean), proof (with trust_score, handshake_id, status), embed_format.
   */
  async verify(proofToken) {
    const cached = this.verifyCache.get(proofToken);
    if (cached) return cached;

    return this.deduplicator.dedupe(`verify:${proofToken}`, async () => {
      const isCompactProof = String(proofToken).startsWith('shk_');
      const result = await this.request(
        isCompactProof
          ? `/shake/proof/verify/${encodeURIComponent(proofToken)}`
          : `/handshake/secure-envelope/${encodeURIComponent(proofToken)}`
      );

      const ok = isCompactProof ? result.valid === true : result.success === true;
      const ttl = ok ? TTL.VERIFY_SUCCESS : TTL.VERIFY_FAILURE;
      this.verifyCache.set(proofToken, result, ttl);
      return result;
    });
  }

  /**
   * Get the full chain of trust for a handshake (CACHED)
   *
   * @param {string} handshakeId - The handshake ID
   * @returns {Promise<Object>} Chain of trust with full provenance
   */
  async getChainOfTrust(handshakeId) {
    const cacheKey = `chain:${handshakeId}`;
    const cached = this.chainCache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.dedupe(cacheKey, async () => {
      const result = await this.request(`/shake/chain/${encodeURIComponent(handshakeId)}`);
      this.chainCache.set(cacheKey, result, TTL.CHAIN_OF_TRUST);
      return result;
    });
  }

  /**
   * Generate a compact proof token from a handshake
   *
   * @param {string} handshakeId - The handshake ID
   * @returns {Promise<Object>} Compact proof (shk_v1.xxx.yyy format)
   */
  async generateProof(handshakeId) {
    return this.request('/shake/proof/generate', 'POST', {
      handshake_id: handshakeId
    });
  }

  /**
   * Verify a compact proof token
   *
   * @param {string} token - The compact proof token
   * @returns {Promise<Object>} Verification result
   */
  async verifyProof(token) {
    return this.verify(token);
  }

  // ===========================================================================
  // AGENT TRUST NEGOTIATION
  // ===========================================================================

  /**
   * Agent-to-agent trust negotiation
   *
   * When you receive data with a proof from another agent,
   * ask Shuka to vouch for their attestation.
   *
   * NOTE: negotiation is a billable operation (standard shake rate).
   * The free verify pre-check prevents paying for invalid proofs.
   *
   * @param {string} proofToken - The proof token to verify
   * @param {string} [purpose] - Why you need to verify this
   * @returns {Promise<Object>} Negotiation result with recommendation,
   *   verification_confidence, and a derived trust_score
   */
  async negotiate(proofToken, purpose) {
    // Free pre-check: an invalid, revoked, or unknown proof never reaches
    // the billable negotiate call. A transport failure here does NOT block
    // negotiation — the backend is the authority.
    let verification = null;
    try {
      verification = await this.verify(proofToken);
    } catch (err) {
      if (err && err.status === 404) {
        return {
          vouched: false,
          recommendation: TrustRecommendation.DO_NOT_PROCEED,
          trust_score: 0,
          evidence: { verification_failed: true, error: 'Proof token not found' }
        };
      }
      // Network/5xx: fall through and let the backend decide
    }

    const proofValid =
      verification == null ||
      verification.valid === true ||
      verification.success === true;

    if (!proofValid) {
      return {
        vouched: false,
        recommendation: TrustRecommendation.DO_NOT_PROCEED,
        trust_score: 0,
        evidence: { verification_failed: true, error: verification.error }
      };
    }

    // Full negotiation (billable — standard shake rate applies).
    // Backend returns { negotiation_id, vouched, subject, claim_verification,
    // verification_confidence, recommendation, message, timestamp } with no
    // top-level trust_score; populate one for downstream consumers.
    const result = await this.request('/shake/agent/negotiate', 'POST', {
      requester: {
        agent_id: this.agentId,
        type: this.agentType
      },
      claim: { proof_token: proofToken },
      context: { purpose: purpose || 'Verifying attestation for data exchange' }
    });

    if (result && result.trust_score == null) {
      const fromProof = verification && verification.proof
        ? verification.proof.trust_score
        : null;
      result.trust_score = result.verification_confidence ?? fromProof ?? null;
    }
    return result;
  }

  // ===========================================================================
  // RECEIPT / ACKNOWLEDGMENT (THE S'MORE)
  // ===========================================================================

  /**
   * Acknowledge receipt of an envelope
   * Completes the S'more - both ends warm
   *
   * @param {string} envelopeId - The envelope ID to acknowledge
   * @param {Object} [options] - Receipt options
   * @returns {Promise<Object>} Receipt result
   */
  async acknowledgeReceipt(envelopeId, options = {}) {
    return this.request('/handshake/receipt', 'POST', {
      envelope_id: envelopeId,
      ...options
    });
  }

  /**
   * Get receipts for a handshake (audit trail)
   *
   * @param {string} handshakeId - The handshake ID
   * @returns {Promise<Object>} List of receipts
   */
  async getReceipts(handshakeId) {
    return this.request(`/handshake/${encodeURIComponent(handshakeId)}/receipts`);
  }

  // ===========================================================================
  // TERMS AND CONDITIONS MANAGEMENT
  // ===========================================================================

  /**
   * Get the terms attached to a handshake (CACHED)
   *
   * Before accepting or processing data from another agent,
   * retrieve the terms to understand what you're agreeing to.
   * Requires an SDK key with license:read.
   *
   * @param {string} handshakeId - The handshake ID (not a proof token)
   * @returns {Promise<Object>} { success, handshake_id, terms, endpoints } —
   *   terms.id is the terms_id used by the ID-based terms methods;
   *   404s with error 'terms_not_found' when the handshake has no terms
   *
   * @example
   * const result = await client.getTerms('handshake-uuid');
   * console.log(result.terms.access_type);        // 'time_limited'
   * console.log(result.terms.permitted_purposes); // ['care_coordination']
   */
  async getTerms(handshakeId) {
    const cacheKey = `terms:${handshakeId}`;
    const cached = this.termsCache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.dedupe(cacheKey, async () => {
      const result = await this.request(
        `/sdk/v1/handshake/${encodeURIComponent(handshakeId)}/terms`
      );
      this.termsCache.set(cacheKey, result, TTL.TERMS);
      return result;
    });
  }

  /**
   * Internal: the legacy /api/handshake/{id}/terms/* convenience family was
   * never implemented server-side (every call 404'd since 2.0.x). Rather
   * than keep silently-broken methods, they now fail fast with a pointer
   * to the working SDK v1 terms API.
   */
  _legacyTermsRemoved(method, replacement) {
    throw new ShukaClientError(
      `${method}() is not supported by the Shuka API (the legacy ` +
      `/handshake/{id}/terms/* routes never existed server-side). ` +
      `Use ${replacement} instead — get the terms_id from getTerms(handshakeId).`,
      'NOT_SUPPORTED',
      { method, replacement }
    );
  }

  /**
   * Accept terms for a proof token or handshake
   *
   * When terms require explicit acceptance, call this to formally accept.
   * This creates an auditable record of your acceptance.
   *
   * @param {string} proofTokenOrHandshakeId - The proof token or handshake ID
   * @param {Object} [options] - Acceptance options
   * @param {string} [options.purpose] - What you intend to use the data for
   * @param {string} [options.acceptorEntityId] - Your entity ID
   * @param {boolean} [options.agreeToDownstreamRestrictions] - Confirm you'll honor downstream rules
   * @returns {Promise<Object>} Acceptance confirmation with receipt
   *
   * @example
   * const acceptance = await client.acceptTerms('shk_v1.abc123.xyz', {
   *   purpose: 'care_coordination',
   *   agreeToDownstreamRestrictions: true
   * });
   * console.log(acceptance.accepted); // true
   * console.log(acceptance.receipt_id); // 'RECEIPT-xxx'
   */
  async acceptTerms() {
    this._legacyTermsRemoved('acceptTerms', 'recordTermsAccess(termsId, { purpose })');
  }

  /**
   * Check if an accessor can access data under current terms (CACHED)
   *
   * Before processing or sharing data, verify that your access is permitted
   * under the current terms. Returns detailed access status and any warnings.
   *
   * @param {string} proofTokenOrHandshakeId - The proof token or handshake ID
   * @param {Object} [options] - Check options
   * @param {string} [options.accessorId] - The entity ID requesting access (defaults to your agentId)
   * @param {string} [options.purpose] - The intended purpose of access
   * @returns {Promise<Object>} Access check result
   *
   * @example
   * const access = await client.checkAccess('shk_v1.abc123.xyz', {
   *   purpose: 'billing'
   * });
   * if (access.permitted) {
   *   // Proceed with the data
   * } else {
   *   console.log(access.reason); // 'Purpose not permitted'
   * }
   */
  async checkAccess() {
    this._legacyTermsRemoved('checkAccess', 'getTerms(handshakeId) and inspect terms.permitted_purposes');
  }

  /**
   * Revoke access to data under your terms
   *
   * As the data owner or steward, revoke access when:
   * - Terms have been violated
   * - Access is no longer needed
   * - Consent has been withdrawn
   *
   * @param {string} proofTokenOrHandshakeId - The proof token or handshake ID
   * @deprecated Never implemented server-side; throws NOT_SUPPORTED.
   * Use revokeTermsById(termsId, { reason }) instead.
   */
  async revokeAccess() {
    this._legacyTermsRemoved('revokeAccess', 'revokeTermsById(termsId, { reason })');
  }

  /**
   * Update terms for an existing handshake
   *
   * As owner or steward, update terms. Previous terms are superseded,
   * not deleted, maintaining full audit trail.
   *
   * @param {string} proofTokenOrHandshakeId - The proof token or handshake ID
   * @param {Object} updates - Terms updates
   * @returns {Promise<Object>} Updated terms
   *
   * @example
   * const updated = await client.updateTerms('shk_v1.abc123.xyz', {
   *   validUntil: '2026-12-31T23:59:59Z',
   *   permittedPurposes: ['care_coordination', 'billing']
   * });
   */
  async updateTerms() {
    this._legacyTermsRemoved('updateTerms', 'updateTermsById(termsId, { ...updates, change_reason })');
  }

  /**
   * Get terms history for audit trail
   *
   * Returns all versions of terms for a handshake, including:
   * - Original terms
   * - All updates
   * - Acceptance records
   * - Revocations
   *
   * @param {string} proofTokenOrHandshakeId - The proof token or handshake ID
   * @returns {Promise<Object>} Terms history with full audit trail
   */
  async getTermsHistory() {
    this._legacyTermsRemoved('getTermsHistory', 'getTermsRevisions(termsId)');
  }

  /**
   * Get list of entities that have accepted terms
   *
   * @param {string} proofTokenOrHandshakeId - The proof token or handshake ID
   * @returns {Promise<Object>} List of acceptors with acceptance details
   */
  async getTermsAcceptors() {
    this._legacyTermsRemoved('getTermsAcceptors', 'getTermsReceipts(termsId)');
  }

  // ===========================================================================
  // REGISTRY DISCOVERY (THE FLYWHEEL)
  // ===========================================================================

  /**
   * Discover registered entities (CACHED)
   *
   * Find organizations that issue or accept specific shake types.
   *
   * @param {Object} [filters] - Discovery filters
   * @param {string} [filters.industry] - Filter by industry
   * @param {string} [filters.compliance] - Filter by compliance framework
   * @param {string} [filters.shakeType] - Filter by shake type
   * @param {boolean} [filters.verifiedOnly] - Only verified registries
   * @returns {Promise<Object>} List of registries
   */
  async discoverRegistries(filters = {}) {
    const cacheKey = `discover:${JSON.stringify(filters)}`;
    const cached = this.registryCache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.dedupe(cacheKey, async () => {
      const params = new URLSearchParams();
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.compliance) params.append('compliance', filters.compliance);
      if (filters.shakeType) params.append('shake_type', filters.shakeType);
      if (filters.verifiedOnly) params.append('verified', 'true');
      if (filters.page) params.append('page', filters.page);
      if (filters.perPage) params.append('per_page', filters.perPage);

      const result = await this.request(`/registry/discover?${params.toString()}`);
      this.registryCache.set(cacheKey, result, TTL.REGISTRY_LOOKUP);
      return result;
    });
  }

  /**
   * Lookup a specific registry by entity ID (CACHED)
   *
   * @param {string} entityId - The entity ID
   * @returns {Promise<Object>} Registry details with policies
   */
  async lookupRegistry(entityId) {
    const cacheKey = `registry:${entityId}`;
    const cached = this.registryCache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.dedupe(cacheKey, async () => {
      const result = await this.request(`/registry/lookup/${encodeURIComponent(entityId)}`);
      this.registryCache.set(cacheKey, result, TTL.REGISTRY_LOOKUP);
      return result;
    });
  }

  /**
   * Check if an entity can issue a specific shake type (CACHED)
   *
   * @param {string} entityId - The entity ID
   * @param {string} shakeType - The shake type
   * @returns {Promise<Object>} Can-issue result with policy
   */
  async canIssue(entityId, shakeType) {
    const cacheKey = `canIssue:${entityId}:${shakeType}`;
    const cached = this.registryCache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.dedupe(cacheKey, async () => {
      const result = await this.request(
        `/registry/can-issue?entity_id=${encodeURIComponent(entityId)}&shake_type=${encodeURIComponent(shakeType)}`
      );
      this.registryCache.set(cacheKey, result, TTL.REGISTRY_LOOKUP);
      return result;
    });
  }

  /**
   * Check if an entity will accept a specific shake type (CACHED)
   *
   * @param {string} entityId - The entity ID
   * @param {string} shakeType - The shake type
   * @param {string} [issuerId] - Optional issuer ID to check acceptance
   * @returns {Promise<Object>} Will-accept result with requirements
   */
  async willAccept(entityId, shakeType, issuerId) {
    const cacheKey = `willAccept:${entityId}:${shakeType}:${issuerId || ''}`;
    const cached = this.registryCache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.dedupe(cacheKey, async () => {
      let url = `/registry/will-accept?entity_id=${encodeURIComponent(entityId)}&shake_type=${encodeURIComponent(shakeType)}`;
      if (issuerId) url += `&issuer_id=${encodeURIComponent(issuerId)}`;

      const result = await this.request(url);
      this.registryCache.set(cacheKey, result, TTL.REGISTRY_LOOKUP);
      return result;
    });
  }

  /**
   * Check interoperability between two entities (CACHED)
   *
   * Can Entity A's shakes be accepted by Entity B?
   *
   * @param {string} issuerEntityId - The issuing entity
   * @param {string} receiverEntityId - The receiving entity
   * @param {string} shakeType - The shake type
   * @returns {Promise<Object>} Interoperability result
   */
  async checkInteroperability(issuerEntityId, receiverEntityId, shakeType) {
    const cacheKey = `interop:${issuerEntityId}:${receiverEntityId}:${shakeType}`;
    const cached = this.interopCache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.dedupe(cacheKey, async () => {
      const result = await this.request('/registry/interop-check', 'POST', {
        issuer_entity_id: issuerEntityId,
        receiver_entity_id: receiverEntityId,
        shake_type: shakeType
      });
      this.interopCache.set(cacheKey, result, TTL.INTEROP_CHECK);
      return result;
    });
  }

  /**
   * Get available shake templates
   *
   * @param {Object} [filters] - Template filters
   * @returns {Promise<Object>} List of templates
   */
  async getTemplates(filters = {}) {
    const params = new URLSearchParams();
    if (filters.industry) params.append('industry', filters.industry);
    if (filters.shakeType) params.append('shake_type', filters.shakeType);
    if (filters.freeOnly) params.append('free_only', 'true');

    return this.request(`/registry/templates?${params.toString()}`);
  }

  // ===========================================================================
  // ONE RING IDEMPOTENT SHAKES (SDK KEY)
  // ===========================================================================

  /**
   * Derive the deterministic entity ID for a piece of entity data.
   * Same data always produces the same ID — this is what makes One Ring
   * shakes idempotent (same entity = same shake, never duplicates).
   *
   * @param {Object} entityData - The entity data (key order does not matter)
   * @returns {string} Deterministic entity ID (ENTITY-<sha256-16>)
   */
  deriveEntityId(entityData) {
    const canonical = JSON.stringify(entityData, Object.keys(entityData).sort());
    const hash = crypto.createHash('sha256').update(canonical).digest('hex');
    return `ENTITY-${hash.substring(0, 16)}`;
  }

  /**
   * Create an idempotent Shuka Shake (the One Ring pattern) — RECOMMENDED.
   *
   * Same entity data always returns the same shake. Safe to call from
   * retries, multiple agents, or repeated workflows: you will never
   * create duplicate attestations for the same entity.
   *
   * Requires an SDK key.
   *
   * @param {string} entityType - Type of entity (e.g. 'invoice', 'patient_record')
   * @param {Object} entityData - The entity data (hashed into a deterministic ID)
   * @param {Object} [options] - Shake options
   * @param {string} [options.purpose] - Why this shake is being created
   * @param {string} [options.industry] - Industry context
   * @param {string} [options.handshakeType] - attestation|verification|transfer|consent
   * @param {number} [options.expiresInDays] - Days until expiration
   * @returns {Promise<Object>} Shake with handshake_id, was_created flag, proof
   */
  async createIdempotentShake(entityType, entityData, options = {}) {
    return this.request('/sdk/v1/shake/idempotent', 'POST', {
      entity_type: entityType,
      entity_id: this.deriveEntityId(entityData),
      handshake_type: options.handshakeType || 'attestation',
      industry: options.industry,
      purpose: options.purpose,
      expires_in_days: options.expiresInDays,
      verification_data: {
        entity_data: entityData,
        agent_id: this.agentId,
        agent_type: this.agentType
      }
    });
  }

  /**
   * Look up an existing shake by entity data (no creation).
   *
   * @param {string} entityType - Type of entity
   * @param {Object} entityData - The entity data used at creation time
   * @returns {Promise<Object>} Existing shake, or found=false
   */
  async lookupShake(entityType, entityData) {
    try {
      return await this.request('/sdk/v1/shake/lookup', 'POST', {
        entity_type: entityType,
        entity_id: this.deriveEntityId(entityData)
      });
    } catch (err) {
      // Backend answers "no such shake" with HTTP 404 — that is the normal
      // negative result for a lookup, not an error
      if (err && err.status === 404) {
        return { success: false, found: false };
      }
      throw err;
    }
  }

  /**
   * Verify a shake by its handshake ID (CACHED).
   *
   * @param {string} shakeId - The handshake/shake ID
   * @returns {Promise<Object>} Verification result with trust score
   */
  async verifyShake(shakeId) {
    const cacheKey = `shake:${shakeId}`;
    const cached = this.verifyCache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.dedupe(cacheKey, async () => {
      const result = await this.request(`/sdk/v1/shake/${encodeURIComponent(shakeId)}/verify`);
      const ttl = result.valid || result.verified ? TTL.VERIFY_SUCCESS : TTL.VERIFY_FAILURE;
      this.verifyCache.set(cacheKey, result, ttl);
      return result;
    });
  }

  // ===========================================================================
  // MARKETPLACE — SHAKE-ANCHORED LICENSE OFFERINGS AND GRANTS (SDK KEY)
  // ===========================================================================

  /**
   * Search marketplace license offerings.
   *
   * @param {Object} [filters] - Search filters
   * @param {string} [filters.q] - Free-text search
   * @param {string} [filters.brand] - Filter by brand
   * @param {string} [filters.type] - Filter by license type
   * @param {number} [filters.minPrice] - Minimum price
   * @param {number} [filters.maxPrice] - Maximum price
   * @param {number} [filters.page] - Page number
   * @param {number} [filters.perPage] - Results per page (max 50)
   * @returns {Promise<Object>} Paginated search results
   */
  async searchLicenses(filters = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.type) params.append('type', filters.type);
    if (filters.minPrice != null) params.append('min_price', filters.minPrice);
    if (filters.maxPrice != null) params.append('max_price', filters.maxPrice);
    if (filters.page) params.append('page', filters.page);
    if (filters.perPage) params.append('per_page', filters.perPage);

    return this.request(`/sdk/v1/licenses/search?${params.toString()}`);
  }

  /**
   * Get full details for a marketplace license.
   *
   * @param {string} licenseId - The license ID
   * @returns {Promise<Object>} License details
   */
  async getLicenseDetails(licenseId) {
    return this.request(`/sdk/v1/licenses/${encodeURIComponent(licenseId)}/details`);
  }

  /**
   * Validate a license (is it real, active, and in good standing?).
   *
   * @param {string} licenseId - The license ID
   * @param {Object} [context] - Optional validation context
   * @returns {Promise<Object>} Validation result
   */
  async validateLicense(licenseId, context = {}) {
    return this.request('/sdk/v1/licenses/validate', 'POST', {
      license_id: licenseId,
      ...context
    });
  }

  /**
   * Issue a license offering anchored to one of your shakes.
   *
   * The offering is issued FROM a handshake — your registered attestation
   * of the underlying IP. Requires an SDK key with license:write and an
   * issuer-capable account (Partner/Admin).
   *
   * @param {Object} offering - Offering parameters
   * @param {string} offering.anchorHandshakeId - Handshake to anchor to (required)
   * @param {string} offering.brand - Brand name (required)
   * @param {string} offering.rightsHolder - Rights holder (required)
   * @param {string} offering.validUntil - Expiry date YYYY-MM-DD (required)
   * @param {number} [offering.buyToOpenPrice] - Grant price
   * @param {string[]} [offering.permittedUses] - Permitted uses
   * @param {string[]} [offering.prohibitedUses] - Prohibited uses
   * @param {number} [offering.maxGrants] - Cap on grants sold
   * @param {number} [offering.royaltyPercentage] - Royalty % (recorded contract terms)
   * @param {number} [offering.royaltyCapUsd] - Royalty cap in USD
   * @param {number} [offering.platformFeePercentage] - Platform fee %
   * @param {string} [offering.imageUrl] - Offering image
   * @returns {Promise<Object>} Issued offering (license_kind='offering')
   */
  async issueLicense(offering) {
    return this.request('/sdk/v1/license/issue', 'POST', {
      anchor_handshake_id: offering.anchorHandshakeId,
      brand: offering.brand,
      rights_holder: offering.rightsHolder,
      valid_until: offering.validUntil,
      issue_date: offering.issueDate,
      buy_to_open_price: offering.buyToOpenPrice,
      permitted_uses: offering.permittedUses,
      prohibited_uses: offering.prohibitedUses,
      max_grants: offering.maxGrants,
      royalty_percentage: offering.royaltyPercentage,
      royalty_cap_usd: offering.royaltyCapUsd,
      platform_fee_percentage: offering.platformFeePercentage,
      image_url: offering.imageUrl
    });
  }

  /**
   * Acquire (purchase) a marketplace license grant.
   *
   * Returns the transaction, portfolio entry, and the attestation
   * (handshake + proof token) anchoring your grant to the ledger.
   *
   * Acquisition is idempotent per buyer+license: a replay returns 409
   * with no double charge, and a license you already own returns
   * 409 already_owned. A payment_amount that doesn't match the current
   * list price returns 400 carrying license_price. Escrow is not
   * available (useEscrow: true fails with escrow_not_available).
   *
   * @param {string} licenseId - The license/offering ID
   * @param {number} paymentAmount - Payment amount (must match list price)
   * @param {Object} [options] - Purchase options
   * @param {string} [options.paymentMethod] - Payment method
   * @returns {Promise<Object>} Transaction with attestation and proof_token
   */
  async acquireLicense(licenseId, paymentAmount, options = {}) {
    return this.request('/sdk/v1/transactions/acquire', 'POST', {
      license_id: licenseId,
      payment_amount: paymentAmount,
      payment_method: options.paymentMethod
    });
  }

  /**
   * Get your license portfolio (everything you own or have been granted).
   *
   * NOTE: this is a billable read ($0.005) and can reject with 402.
   *
   * @returns {Promise<Object>} Portfolio entries
   */
  async getPortfolio() {
    return this.request('/sdk/v1/portfolio');
  }

  /**
   * Verify a marketplace grant against the append-only registry (CACHED).
   *
   * @param {string} grantId - The grant ID (GRANT-...)
   * @returns {Promise<Object>} Grant status, anchoring license, ledger chain
   */
  async verifyGrant(grantId) {
    const cacheKey = `grant:${grantId}`;
    const cached = this.verifyCache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.dedupe(cacheKey, async () => {
      const result = await this.request(`/sdk/v1/ledger/grant/${encodeURIComponent(grantId)}/verify`);
      const ttl = result.valid ? TTL.VERIFY_SUCCESS : TTL.VERIFY_FAILURE;
      this.verifyCache.set(cacheKey, result, ttl);
      return result;
    });
  }

  /**
   * Get the full append-only registry history for an entity.
   *
   * @param {string} entityType - Entity type (e.g. 'license', 'grant')
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} Chronological ledger entries
   */
  async getEntityHistory(entityType, entityId) {
    return this.request(
      `/sdk/v1/ledger/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`
    );
  }

  // ===========================================================================
  // ENTERPRISE LICENSING (SDK KEY)
  // ===========================================================================

  /**
   * Browse enterprise (multi-seat) license offerings.
   *
   * @param {Object} [filters] - Filters
   * @param {string} [filters.brand] - Filter by brand
   * @param {number} [filters.minSeats] - Minimum seats needed
   * @param {number} [filters.maxPrice] - Maximum price
   * @param {number} [filters.page] - Page number
   * @param {number} [filters.perPage] - Results per page
   * @returns {Promise<Object>} Enterprise offerings
   */
  async getEnterpriseLicenses(filters = {}) {
    const params = new URLSearchParams();
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.minSeats != null) params.append('min_seats', filters.minSeats);
    if (filters.maxPrice != null) params.append('max_price', filters.maxPrice);
    if (filters.page) params.append('page', filters.page);
    if (filters.perPage) params.append('per_page', filters.perPage);

    return this.request(`/sdk/v1/enterprise/licenses?${params.toString()}`);
  }

  /**
   * Acquire an enterprise license for your team.
   *
   * NOT CURRENTLY AVAILABLE: the backend's enterprise seat model is not
   * built and this route returns 501 not_implemented for every request.
   * Use acquireLicense() for single-grant purchases. The method is kept
   * so the explicit 501 surfaces rather than a silent failure.
   *
   * @param {Object} params - Acquisition parameters
   * @param {string} params.licenseId - The enterprise license ID
   * @param {number} params.seatsNeeded - Number of seats
   * @returns {Promise<Object>} Always rejects with a 501 until the seat model ships
   */
  async acquireEnterpriseLicense(params) {
    return this.request('/sdk/v1/enterprise/acquire', 'POST', {
      license_id: params.licenseId,
      seats_needed: params.seatsNeeded
    });
  }

  // ===========================================================================
  // RULES LAYER — SDK v1 TERMS ON IMMUTABLE HANDSHAKES (SDK KEY)
  // ===========================================================================

  /**
   * Attach terms (the rules layer) to an immutable handshake.
   *
   * The handshake never changes; the terms riding on it can be amended,
   * re-priced, or revoked without re-attesting.
   *
   * @param {string} handshakeId - The handshake to attach terms to
   * @param {Object} terms - Terms definition
   * @param {string} terms.accessType - single_use|time_limited|use_limited|perpetual|session_bound|windowed
   * @param {Object} [terms.accessConfig] - Access-type-specific config
   * @param {string[]} [terms.permittedPurposes] - Allowed purposes
   * @param {string[]} [terms.prohibitedPurposes] - Forbidden purposes
   * @param {boolean} [terms.allowDownstream] - Allow downstream transfer
   * @param {boolean} [terms.requireReceipt] - Require access receipts
   * @returns {Promise<Object>} Created terms with terms_id (409 terms_exist
   *   if the handshake already has terms)
   */
  async createTerms(handshakeId, terms) {
    return this.request('/sdk/v1/terms', 'POST', {
      handshake_id: handshakeId,
      access_type: terms.accessType,
      access_config: terms.accessConfig,
      permitted_purposes: terms.permittedPurposes,
      prohibited_purposes: terms.prohibitedPurposes,
      allow_downstream: terms.allowDownstream,
      require_receipt: terms.requireReceipt,
      ...terms.extra
    });
  }

  /**
   * Get terms by terms ID (SDK v1).
   *
   * @param {string} termsId - The terms ID
   * @returns {Promise<Object>} Current terms
   */
  async getTermsById(termsId) {
    return this.request(`/sdk/v1/terms/${encodeURIComponent(termsId)}`);
  }

  /**
   * Amend terms by terms ID (SDK v1). A revision is recorded.
   *
   * @param {string} termsId - The terms ID
   * @param {Object} updates - Fields to change (include change_reason)
   * @returns {Promise<Object>} Amended terms
   */
  async updateTermsById(termsId, updates) {
    return this.request(`/sdk/v1/terms/${encodeURIComponent(termsId)}`, 'PUT', updates);
  }

  /**
   * Revoke terms by terms ID (SDK v1).
   *
   * @param {string} termsId - The terms ID
   * @param {Object} options - Revocation options
   * @param {string} options.reason - Why access is being revoked (REQUIRED —
   *   the backend 400s without it)
   * @returns {Promise<Object>} Revocation confirmation
   */
  async revokeTermsById(termsId, options = {}) {
    return this.request(`/sdk/v1/terms/${encodeURIComponent(termsId)}/revoke`, 'POST', {
      revocation_reason: options.reason
    });
  }

  /**
   * Record an access under the terms (creates an access receipt).
   *
   * @param {string} termsId - The terms ID
   * @param {Object} [options] - Access details
   * @param {string} [options.accessorId] - Who accessed (defaults to your agentId)
   * @param {string} [options.purpose] - Why
   * @returns {Promise<Object>} Access receipt
   */
  async recordTermsAccess(termsId, options = {}) {
    return this.request(`/sdk/v1/terms/${encodeURIComponent(termsId)}/access`, 'POST', {
      accessor_id: options.accessorId || this.agentId,
      access_purpose: options.purpose
    });
  }

  /**
   * Get the full amendment history for terms (SDK v1).
   *
   * @param {string} termsId - The terms ID
   * @returns {Promise<Object>} Revision list
   */
  async getTermsRevisions(termsId) {
    return this.request(`/sdk/v1/terms/${encodeURIComponent(termsId)}/revisions`);
  }

  /**
   * Get access receipts (audit trail) for terms (SDK v1).
   *
   * @param {string} termsId - The terms ID
   * @returns {Promise<Object>} Receipt list
   */
  async getTermsReceipts(termsId) {
    return this.request(`/sdk/v1/terms/${encodeURIComponent(termsId)}/receipts`);
  }

  /**
   * Get the terms attached to a handshake (SDK v1).
   *
   * @param {string} handshakeId - The handshake ID
   * @returns {Promise<Object>} Terms for the handshake
   */
  async getHandshakeTermsV1(handshakeId) {
    return this.request(`/sdk/v1/handshake/${encodeURIComponent(handshakeId)}/terms`);
  }

  // ===========================================================================
  // STATUS AND USAGE
  // ===========================================================================

  /**
   * Get SDK status and discovery info (CACHED)
   */
  async getStatus() {
    const cached = this.statusCache.get('status');
    if (cached) return cached;

    return this.deduplicator.dedupe('status', async () => {
      const result = await this.request('/sdk/v1/status');
      this.statusCache.set('status', result, TTL.STATUS);
      return result;
    });
  }

  /**
   * Get usage statistics (CACHED)
   */
  async getUsageStats() {
    const cached = this.statusCache.get('usage');
    if (cached) return cached;

    return this.deduplicator.dedupe('usage', async () => {
      const result = await this.request('/sdk/v1/usage/stats');
      this.statusCache.set('usage', result, TTL.USAGE_STATS);
      return result;
    });
  }

  /**
   * Get pricing information
   */
  async getPricing() {
    return this.request('/sdk/v1/pricing');
  }

  /**
   * Validate API key
   */
  async validateApiKey() {
    return this.request('/sdk/v1/auth/validate', 'POST', {});
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  /**
   * Get combined cache statistics
   */
  getCacheStats() {
    return {
      verify: this.verifyCache.getStats(),
      chain: this.chainCache.getStats(),
      registry: this.registryCache.getStats(),
      interop: this.interopCache.getStats(),
      status: this.statusCache.getStats(),
      terms: this.termsCache.getStats(),
      pendingRequests: this.deduplicator.pendingCount
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.verifyCache.clear();
    this.chainCache.clear();
    this.registryCache.clear();
    this.interopCache.clear();
    this.statusCache.clear();
    this.termsCache.clear();
  }

  /**
   * Invalidate a specific proof token from cache
   */
  invalidate(proofToken) {
    this.verifyCache.delete(proofToken);
  }

  // ==========================================================================
  // THE DRAWBRIDGE (v2.2.0): decision point, crossing-passes, grant revocation
  // ==========================================================================

  /**
   * Ask the decision point: may this accessor use this data for this purpose
   * right now? Evaluates the stored Terms Layer + the shake's revocation
   * state server-side and returns a SIGNED verdict. Allowed crossings are
   * receipted and ledgered (ACCESSED).
   *
   * POST /api/sdk/v1/access/check
   *
   * @param {Object} params - { termsId | handshakeId | proofToken, purpose,
   *                            accessorId, record (default true) }
   * @returns {Promise<Object>} { allowed, decision, reason, verdict, receipt_id }
   */
  async accessCheck(params = {}) {
    const body = { purpose: params.purpose || 'unspecified',
                   record: params.record !== false };
    if (params.termsId) body.terms_id = params.termsId;
    else if (params.handshakeId) body.handshake_id = params.handshakeId;
    else if (params.proofToken) body.proof_token = params.proofToken;
    if (params.accessorId || this.agentId) {
      body.accessor_id = params.accessorId || this.agentId;
    }
    return this.request('/sdk/v1/access/check', 'POST', body);
  }

  /**
   * Exchange this client's key for a short-lived, scope-limited
   * CROSSING-PASS (60s-1h). Hand the pass to the agent; keep the partner
   * key in the vault. Passes cannot create keys or exchange again.
   *
   * POST /api/sdk/v1/keys/exchange
   *
   * @param {Object} [options] - { expiresInSeconds, permissions, name }
   * @returns {Promise<Object>} { crossing_pass, key_id, expires_at, ... }
   */
  async exchangeCrossingPass(options = {}) {
    return this.request('/sdk/v1/keys/exchange', 'POST', {
      expires_in_seconds: options.expiresInSeconds || 900,
      permissions: options.permissions,
      name: options.name,
    });
  }

  /**
   * Revoke a shake — the consent-withdrawal lever. Status flips to revoked,
   * the transactional CONSENT_REVOKED ledger event is written, terms and
   * compact proofs cascade, and every subsequent access check denies with
   * reason 'consent_revoked'.
   *
   * POST /api/sdk/v1/shake/{shakeId}/revoke
   *
   * @param {string} shakeId - The handshake/shake ID
   * @param {string} [reason] - Revocation reason (audit trail)
   * @returns {Promise<Object>} Revocation result
   */
  async revokeShake(shakeId, reason) {
    return this.request(`/sdk/v1/shake/${encodeURIComponent(shakeId)}/revoke`,
                        'POST', reason ? { reason } : {});
  }

  /**
   * Revoke a license grant (issuer or admin only). Writes the
   * transactional GRANT_REVOKED ledger event; the grant's proof stops
   * verifying immediately.
   *
   * POST /api/sdk/v1/grants/{grantId}/revoke
   *
   * @param {string} grantId - The grant ID
   * @param {string} [reason] - Revocation reason
   * @returns {Promise<Object>} Revocation result
   */
  async revokeGrant(grantId, reason) {
    return this.request(`/sdk/v1/grants/${encodeURIComponent(grantId)}/revoke`,
                        'POST', { reason });
  }
}

// ===========================================================================
// SINGLETON MANAGEMENT
// ===========================================================================

let defaultClient = null;

/**
 * Get the default client instance (singleton)
 */
function getClient(config) {
  if (!defaultClient) {
    defaultClient = new ShukaClient(config);
  }
  return defaultClient;
}

/**
 * Reset the default client
 */
function resetClient() {
  defaultClient = null;
}

// ===========================================================================
// EXPORTS
// ===========================================================================

module.exports = {
  // Main client
  ShukaClient,
  ShukaClientError,

  // Cache utilities
  AttestationCache,
  RequestDeduplicator,

  // Singleton helpers
  getClient,
  resetClient,

  // Enums and constants
  HandshakeType,
  HandshakeStatus,
  TrustRecommendation,
  Industry,
  TTL,

  // Terms and conditions enums
  AccessType,
  TermsStatus,
  DelegationLevel
};
