/**
 * Shuka SDK - Universal Trust Guardian for AI Agents
 *
 * The Shuka Shake is the universal attestation layer for the AI economy.
 * It provides trust, verification, and portable proof for ANY data exchange
 * between agents, systems, and jurisdictions.
 *
 * Core capabilities:
 * - Create verifiable attestations for any claim
 * - One Ring idempotent shakes (same entity = same shake, forever)
 * - Verify proof tokens from other agents
 * - Negotiate trust between agents (Shuka as arbiter)
 * - Complete exchanges with receipts (the S'more model)
 * - Rules layer: modifiable terms on immutable handshakes
 * - Shake-anchored marketplace: issue offerings, purchase licenses, verify grants
 * - Enterprise licensing: multi-seat acquisition
 * - Registry: append-only ledger history and interoperability checks
 *
 * Everything is a Shuka Shake.
 * Schema-agnostic. Industry-agnostic. Jurisdiction-agnostic.
 *
 * @author Auron
 * @version 2.1.1
 * @see https://shuka.app
 */

const { ShukaClient, ShukaClientError } = require('./client');

// ===========================================================================
// CUSTOM ERROR CLASS
// ===========================================================================

/**
 * Custom error class for Shuka SDK errors
 */
class ShukaSDKError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ShukaSDKError';
    this.code = code;
    this.details = details;
  }
}

// ===========================================================================
// MAIN SDK CLASS - UNIVERSAL TRUST OPERATIONS
// ===========================================================================

/**
 * Main Shuka SDK class - Universal Trust Guardian
 *
 * Use this for any attestation, verification, or trust negotiation.
 * The SDK handles the full lifecycle of trust in the AI economy.
 */
class ShukaSDK {
  /**
   * @param {Object} config - Configuration options
   * @param {string} config.apiKey - REQUIRED: Your Shuka SDK API key
   * @param {string} [config.apiBase] - API base URL
   * @param {string} [config.agentName] - Name of your AI agent (for audit trails)
   * @param {number} [config.timeout] - Request timeout in ms
   * @param {number} [config.retries] - Number of retries
   * @param {number} [config.cacheTTL] - Cache TTL in ms
   */
  constructor(config = {}) {
    if (!config.apiKey && !process.env.SHUKA_API_KEY) {
      throw new ShukaSDKError(
        'API key required. Get yours at https://shuka.app/partner/sdk',
        'MISSING_API_KEY',
        { docs: 'https://shuka.app/docs' }
      );
    }

    this.client = new ShukaClient({
      apiKey: config.apiKey,
      apiBase: config.apiBase,
      agentId: config.agentName || 'shuka-sdk',
      cacheTTL: config.cacheTTL,
      timeout: config.timeout,
      retries: config.retries
    });

    this.agentName = config.agentName || 'shuka-agent';
  }

  // =========================================================================
  // CORE ATTESTATION OPERATIONS
  // =========================================================================

  /**
   * Create a verifiable attestation for any claim or data
   *
   * Use this when you need to:
   * - Prove a claim is true with cryptographic certainty
   * - Create an audit trail for data being shared
   * - Attest to compliance, consent, or authorization
   * - Generate a portable proof that other agents can verify
   *
   * @param {string} description - What you are attesting to (be specific —
   *   include industry/jurisdiction context in the text; the quick-attest
   *   endpoint attests the text and optional terms only)
   * @param {Object} [options] - Additional options
   * @param {Object} [options.terms] - Terms for data access (see client.createAttestation)
   * @returns {Promise<Object>} Attestation result with proof_token
   *
   * @example
   * // Healthcare ROI attestation
   * const result = await shuka.attest(
   *   'US healthcare ROI: Patient John Doe (ID 12345) consents to release medical records to Dr. Smith (NPI 9876543210)'
   * );
   *
   * @example
   * // Construction compliance attestation with access terms
   * const result = await shuka.attest(
   *   'UK construction: Vehicle ABC123 (euro6) ULEZ compliant for London work permit',
   *   { terms: { accessType: 'time_limited', validityDays: 90 } }
   * );
   */
  async attest(description, options = {}) {
    return this.client.createAttestation(description, options);
  }

  /**
   * Alias for attest() - create attestation
   */
  async createAttestation(description, options = {}) {
    return this.attest(description, options);
  }

  /**
   * Create a secure envelope (hash-only notary mode)
   *
   * Shuka sees ONLY the hash of encrypted data. Client-side encryption,
   * Shuka never touches plaintext. Traditional notary model.
   *
   * Use for: Maximum privacy, E2E encrypted transfers, zero-knowledge proofs
   *
   * @param {Object} data - Envelope data
   * @returns {Promise<Object>} Envelope result with envelope_id
   */
  async createSecureEnvelope(data) {
    return this.client.createSecureEnvelope(data);
  }

  /**
   * Create a validated envelope (trust layer mode)
   *
   * Shuka SEES and VALIDATES the data before attesting to it.
   * Validation adapters check claims against external sources.
   *
   * Use for: Regulatory compliance, contractor verification, ULEZ checks
   *
   * @param {Object} data - Validated envelope data
   * @param {Object} data.metadata_payload - The actual metadata to validate
   * @param {string} [data.schema_fingerprint] - Schema identifier
   * @param {string} [data.recipient_id] - Intended recipient
   * @param {Object} [data.transfer_metadata] - Industry, jurisdiction, categories
   * @returns {Promise<Object>} Validated envelope result
   */
  async createValidatedEnvelope(data) {
    return this.client.createValidatedEnvelope(data);
  }

  // =========================================================================
  // VERIFICATION OPERATIONS
  // =========================================================================

  /**
   * Verify a proof token and get attestation details
   *
   * Use this when:
   * - You receive a proof token and need to confirm it's valid
   * - You want to check the trust score before proceeding
   * - You need to see what was attested and when
   *
   * Proof tokens look like: shk_v1.YWJjMTIz.a1b2c3 or ENV-xxx
   *
   * @param {string} proofToken - The Shuka proof token to verify
   * @returns {Promise<Object>} Verification result
   */
  async verify(proofToken) {
    return this.client.verify(proofToken);
  }

  /**
   * Get the full chain of trust for a handshake
   *
   * Returns the complete provenance: who attested, when, validation evidence,
   * and any linked attestations in the chain.
   *
   * @param {string} handshakeId - The handshake ID
   * @returns {Promise<Object>} Chain of trust data
   */
  async getChainOfTrust(handshakeId) {
    return this.client.getChainOfTrust(handshakeId);
  }

  // =========================================================================
  // AGENT TRUST NEGOTIATION
  // =========================================================================

  /**
   * Agent-to-agent trust negotiation with Shuka as arbiter
   *
   * When Agent A receives data with a proof from Agent B,
   * Agent A asks Shuka to vouch for B's attestation.
   *
   * Returns a recommendation:
   * - safe_to_proceed: Trust >= 0.8, validation passed
   * - proceed_with_caution: Trust 0.6-0.8, or partial validation
   * - additional_verification_recommended: Trust < 0.6
   * - do_not_proceed: Not vouched, revoked, or validation failed
   *
   * @param {string} proofToken - The proof token to verify
   * @param {string} [purpose] - Why you need to verify this (context for trust decision)
   * @returns {Promise<Object>} Negotiation result with recommendation
   */
  async negotiate(proofToken, purpose) {
    return this.client.negotiate(proofToken, purpose);
  }

  /**
   * Vouch for another agent's claim (alias for negotiate)
   */
  async vouch(proofToken, purpose) {
    return this.negotiate(proofToken, purpose);
  }

  // =========================================================================
  // RECEIPT / ACKNOWLEDGMENT (COMPLETING THE S'MORE)
  // =========================================================================

  /**
   * Acknowledge receipt of an envelope
   *
   * Both ends of the Shuka Shake must be "warm" - the sender initiates,
   * the recipient acknowledges. This completes the S'more.
   *
   * @param {string} envelopeId - The envelope ID to acknowledge
   * @param {Object} [options] - Receipt options
   * @returns {Promise<Object>} Receipt result
   */
  async acknowledgeReceipt(envelopeId, options = {}) {
    return this.client.acknowledgeReceipt(envelopeId, options);
  }

  // =========================================================================
  // TERMS AND CONDITIONS
  // =========================================================================

  /**
   * Get terms for data before accepting or processing
   *
   * When you receive data with a proof token from another agent,
   * ALWAYS check the terms before proceeding. Terms define:
   * - What you can do with the data
   * - How long you can access it
   * - Who else you can share it with
   * - What purposes are allowed
   *
   * @param {string} handshakeId - The handshake ID (not a proof token)
   * @returns {Promise<Object>} { success, terms, endpoints } — terms.id is
   *   the terms_id for updateTermsById/revokeTermsById/recordTermsAccess
   *
   * @example
   * const result = await shuka.getTerms('handshake-uuid');
   * console.log(result.terms.permitted_purposes);
   */
  async getTerms(handshakeId) {
    return this.client.getTerms(handshakeId);
  }

  /**
   * NOT SUPPORTED — the legacy accept-terms route never existed server-side.
   * Use recordTermsAccess(termsId, { purpose }) instead.
   */
  async acceptTerms(proofToken, options = {}) {
    return this.client.acceptTerms(proofToken, options);
  }

  /**
   * NOT SUPPORTED — the legacy check-access route never existed server-side.
   * Use getTerms(handshakeId) and inspect terms.permitted_purposes.
   */
  async checkAccess(proofToken, options = {}) {
    return this.client.checkAccess(proofToken, options);
  }

  /**
   * NOT SUPPORTED — the legacy revoke-access route never existed server-side.
   * Use revokeTermsById(termsId, { reason }) instead.
   */
  async revokeAccess(proofToken, options = {}) {
    return this.client.revokeAccess(proofToken, options);
  }

  /**
   * NOT SUPPORTED — use updateTermsById(termsId, { ...updates, change_reason }).
   */
  async updateTerms(proofToken, updates = {}) {
    return this.client.updateTerms(proofToken, updates);
  }

  /**
   * NOT SUPPORTED — use getTermsRevisions(termsId).
   */
  async getTermsHistory(proofToken) {
    return this.client.getTermsHistory(proofToken);
  }

  /**
   * NOT SUPPORTED — use getTermsReceipts(termsId).
   */
  async getTermsAcceptors(proofToken) {
    return this.client.getTermsAcceptors(proofToken);
  }

  // =========================================================================
  // ONE RING IDEMPOTENT SHAKES
  // =========================================================================

  /**
   * Create (or return) THE shake for an entity — the headline method.
   *
   * One entity = one shake, forever. The entity ID is derived
   * deterministically from the entity data, so calling this twice with the
   * same data returns the SAME shake (idempotent). Terms, offerings, grants,
   * and registry events all anchor to this one shake.
   *
   * @param {string} entityType - Type of entity (patient_consent, contractor_license, property_deed, ...)
   * @param {Object} entityData - The identifying data for the entity
   * @param {Object} [options] - Options
   * @param {string} [options.purpose] - Why this shake exists
   * @param {string} [options.industry] - healthcare, construction, finance, legal, government, universal
   * @param {string} [options.handshakeType] - attestation, verification, transfer, consent
   * @param {number} [options.expiresInDays] - Optional expiry
   * @returns {Promise<Object>} The shake (new or existing) with handshake_id and proof_token
   *
   * @example
   * const shake = await shuka.shake('patient_consent', {
   *   patient_id: 'P-12345',
   *   provider_npi: '9876543210'
   * }, { industry: 'healthcare', purpose: 'ROI for care coordination' });
   */
  async shake(entityType, entityData, options = {}) {
    return this.client.createIdempotentShake(entityType, entityData, options);
  }

  /**
   * Alias for shake() - create idempotent shake
   */
  async createIdempotentShake(entityType, entityData, options = {}) {
    return this.shake(entityType, entityData, options);
  }

  /**
   * Look up whether a shake already exists for an entity (no creation)
   *
   * @param {string} entityType - Type of entity
   * @param {Object} entityData - The identifying data
   * @returns {Promise<Object>} Lookup result (exists + shake details if found)
   */
  async lookupShake(entityType, entityData) {
    return this.client.lookupShake(entityType, entityData);
  }

  /**
   * Verify a shake by its ID
   *
   * @param {string} shakeId - The shake / handshake ID
   * @returns {Promise<Object>} Verification result with trust score
   */
  async verifyShake(shakeId) {
    return this.client.verifyShake(shakeId);
  }

  // =========================================================================
  // MARKETPLACE — SHAKE-ANCHORED OFFERINGS AND GRANTS
  // =========================================================================

  /**
   * Search the shake-anchored license marketplace
   *
   * @param {Object} [filters] - Search filters (q, brand, type, min_price, max_price, page, per_page)
   * @returns {Promise<Object>} Search results
   */
  async searchLicenses(filters = {}) {
    return this.client.searchLicenses(filters);
  }

  /**
   * Get full details for a marketplace license offering
   *
   * @param {string|number} licenseId - The license ID
   * @returns {Promise<Object>} License details
   */
  async getLicense(licenseId) {
    return this.client.getLicenseDetails(licenseId);
  }

  /**
   * Validate a license before purchase or use
   *
   * @param {string|number} licenseId - The license ID
   * @param {Object} [context] - Validation context
   * @returns {Promise<Object>} Validation result
   */
  async validateLicense(licenseId, context = {}) {
    return this.client.validateLicense(licenseId, context);
  }

  /**
   * Issue a license offering anchored to one of YOUR handshakes
   *
   * The offering is issued FROM a shake — the anchor handshake proves the
   * underlying rights. Requires an SDK key with license:write permission
   * and an issuer-capable account role.
   *
   * @param {Object} offering - Offering details
   * @param {string} offering.anchorHandshakeId - The shake to anchor the offering to (REQUIRED)
   * @param {string} offering.brand - Brand / title (REQUIRED)
   * @param {string} offering.rightsHolder - Legal rights holder (REQUIRED)
   * @param {string} offering.validUntil - Expiry date ISO string (REQUIRED)
   * @param {number} [offering.buyToOpenPrice] - Purchase price
   * @param {string[]} [offering.permittedUses] - What buyers may do
   * @param {string[]} [offering.prohibitedUses] - What buyers may not do
   * @param {number} [offering.maxGrants] - Maximum number of grants
   * @param {number} [offering.royaltyPercentage] - Royalty percent
   * @param {number} [offering.royaltyCapUsd] - Royalty cap in USD
   * @param {number} [offering.platformFeePercentage] - Platform fee percent
   * @param {string} [offering.imageUrl] - Offering image
   * @returns {Promise<Object>} Issued offering with license details
   *
   * @example
   * const offering = await shuka.issueLicense({
   *   anchorHandshakeId: 'HS-abc123',
   *   brand: 'Verified Voice Likeness',
   *   rightsHolder: 'Jane Doe',
   *   validUntil: '2027-12-31T00:00:00Z',
   *   buyToOpenPrice: 500,
   *   maxGrants: 10
   * });
   */
  async issueLicense(offering) {
    return this.client.issueLicense(offering);
  }

  /**
   * Purchase a license from the marketplace (creates a grant)
   *
   * @param {string|number} licenseId - The license to acquire
   * @param {number} paymentAmount - Payment amount
   * @param {Object} [options] - Options (paymentMethod). Idempotent per
   *   buyer+license: replays / already-owned return 409, stale price 400.
   * @returns {Promise<Object>} Grant with proof_token and attestation
   */
  async purchaseLicense(licenseId, paymentAmount, options = {}) {
    return this.client.acquireLicense(licenseId, paymentAmount, options);
  }

  /**
   * Alias for purchaseLicense()
   */
  async acquireLicense(licenseId, paymentAmount, options = {}) {
    return this.purchaseLicense(licenseId, paymentAmount, options);
  }

  /**
   * Verify a grant against the registry ledger
   *
   * @param {string} grantId - The grant ID
   * @returns {Promise<Object>} Grant status, anchoring license, ledger chain integrity
   */
  async verifyGrant(grantId) {
    return this.client.verifyGrant(grantId);
  }

  /**
   * Get your license portfolio (offerings issued + grants held)
   *
   * @returns {Promise<Object>} Portfolio
   */
  async getPortfolio() {
    return this.client.getPortfolio();
  }

  /**
   * Get the full registry ledger history for an entity
   *
   * @param {string} entityType - Entity type (license, grant, handshake, ...)
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} Append-only event history
   */
  async getHistory(entityType, entityId) {
    return this.client.getEntityHistory(entityType, entityId);
  }

  // =========================================================================
  // ENTERPRISE LICENSING
  // =========================================================================

  /**
   * Browse enterprise (multi-seat) license offerings
   *
   * @param {Object} [filters] - Filters (brand, min_seats, max_price, page, per_page)
   * @returns {Promise<Object>} Enterprise offerings
   */
  async browseEnterpriseLicenses(filters = {}) {
    return this.client.getEnterpriseLicenses(filters);
  }

  /**
   * Acquire enterprise license seats for a team
   *
   * @param {Object} params - Acquisition params
   * @param {string|number} params.licenseId - The enterprise license
   * @param {number} params.seatsNeeded - Number of seats
   * @returns {Promise<Object>} Always rejects with 501 — the enterprise
   *   seat model is not built server-side yet
   */
  async acquireEnterpriseSeats(params) {
    return this.client.acquireEnterpriseLicense(params);
  }

  // =========================================================================
  // RULES LAYER — MODIFIABLE TERMS ON IMMUTABLE HANDSHAKES
  // =========================================================================

  /**
   * Create terms (rules) attached to a handshake
   *
   * The handshake is immutable; the terms are the modifiable rules layer.
   * Amend, re-price, or revoke without re-attesting.
   *
   * @param {string} handshakeId - The handshake to attach terms to
   * @param {Object} terms - Terms definition (access_type, permitted_purposes, prohibited_purposes, access_config, ...)
   * @returns {Promise<Object>} Created terms with terms_id
   */
  async createTerms(handshakeId, terms) {
    return this.client.createTerms(handshakeId, terms);
  }

  /**
   * Get terms by their terms ID
   *
   * @param {string} termsId - The terms ID
   * @returns {Promise<Object>} Terms details
   */
  async getTermsById(termsId) {
    return this.client.getTermsById(termsId);
  }

  /**
   * Amend existing terms (creates a new revision, full audit trail kept)
   *
   * @param {string} termsId - The terms ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated terms
   */
  async amendTerms(termsId, updates) {
    return this.client.updateTermsById(termsId, updates);
  }

  /**
   * Revoke terms by their terms ID
   *
   * @param {string} termsId - The terms ID
   * @param {Object} options - Options; reason is REQUIRED (backend 400s without it)
   * @returns {Promise<Object>} Revocation confirmation
   */
  async revokeTermsById(termsId, options = {}) {
    return this.client.revokeTermsById(termsId, options);
  }

  /**
   * Record an access event against terms (creates an auditable receipt)
   *
   * @param {string} termsId - The terms ID
   * @param {Object} [options] - Options (accessorId, purpose)
   * @returns {Promise<Object>} Access receipt
   */
  async recordAccess(termsId, options = {}) {
    return this.client.recordTermsAccess(termsId, options);
  }

  /**
   * Get all revisions of terms (amendment history)
   *
   * @param {string} termsId - The terms ID
   * @returns {Promise<Object>} Revision history
   */
  async getTermsRevisions(termsId) {
    return this.client.getTermsRevisions(termsId);
  }

  /**
   * Get access receipts recorded against terms
   *
   * @param {string} termsId - The terms ID
   * @returns {Promise<Object>} Access receipts
   */
  async getTermsReceipts(termsId) {
    return this.client.getTermsReceipts(termsId);
  }

  /**
   * Get the current terms attached to a handshake
   *
   * @param {string} handshakeId - The handshake ID
   * @returns {Promise<Object>} Current terms
   */
  async getHandshakeTerms(handshakeId) {
    return this.client.getHandshakeTermsV1(handshakeId);
  }

  // =========================================================================
  // THE DRAWBRIDGE (v2.2.0)
  // =========================================================================

  /**
   * The decision point: may this accessor use this data for this purpose
   * right now? Returns a signed allow/deny verdict; allowed crossings are
   * receipted on the hash-chained ledger. This is what shuka.guard calls
   * on every crossing — use it directly for custom enforcement points.
   *
   * @param {Object} params - { termsId | handshakeId | proofToken, purpose, accessorId, record }
   * @returns {Promise<Object>} { allowed, decision, reason, verdict, receipt_id }
   */
  async accessCheck(params = {}) {
    return this.client.accessCheck(params);
  }

  /**
   * Exchange this key for a short-lived, scope-limited crossing-pass.
   * Agents hold passes, never the partner key.
   *
   * @param {Object} [options] - { expiresInSeconds (60-3600), permissions, name }
   * @returns {Promise<Object>} { crossing_pass, key_id, expires_at }
   */
  async exchangeCrossingPass(options = {}) {
    return this.client.exchangeCrossingPass(options);
  }

  /**
   * Revoke a shake — the owner's consent-withdrawal lever. Every
   * subsequent accessCheck denies with reason 'consent_revoked'.
   *
   * @param {string} shakeId - The handshake/shake ID
   * @param {string} [reason] - Revocation reason
   * @returns {Promise<Object>} Revocation result
   */
  async revokeShake(shakeId, reason) {
    return this.client.revokeShake(shakeId, reason);
  }

  /**
   * Revoke a license grant (issuer/admin). GRANT_REVOKED lands on the
   * ledger transactionally; verifyGrant() reports it immediately.
   *
   * @param {string} grantId - The grant ID
   * @param {string} [reason] - Revocation reason
   * @returns {Promise<Object>} Revocation result
   */
  async revokeGrant(grantId, reason) {
    return this.client.revokeGrant(grantId, reason);
  }

  // =========================================================================
  // REGISTRY DISCOVERY AND INTEROPERABILITY
  // =========================================================================

  /**
   * Discover registries by industry / jurisdiction / shake type
   *
   * @param {Object} [filters] - Filters (industry, jurisdiction, shake_type)
   * @returns {Promise<Object>} Matching registries
   */
  async discoverRegistries(filters = {}) {
    return this.client.discoverRegistries(filters);
  }

  /**
   * Look up a registry entity by ID
   *
   * @param {string} entityId - The registry entity ID
   * @returns {Promise<Object>} Entity details
   */
  async lookupRegistry(entityId) {
    return this.client.lookupRegistry(entityId);
  }

  /**
   * Check whether an entity can issue a given shake type
   *
   * @param {string} entityId - The issuer entity ID
   * @param {string} shakeType - The shake type
   * @returns {Promise<Object>} Issuance capability result
   */
  async canIssue(entityId, shakeType) {
    return this.client.canIssue(entityId, shakeType);
  }

  /**
   * Check whether an entity will accept a shake type from an issuer
   *
   * @param {string} entityId - The receiver entity ID
   * @param {string} shakeType - The shake type
   * @param {string} issuerId - The issuer entity ID
   * @returns {Promise<Object>} Acceptance result
   */
  async willAccept(entityId, shakeType, issuerId) {
    return this.client.willAccept(entityId, shakeType, issuerId);
  }

  /**
   * Full interoperability check between an issuer and a receiver
   *
   * @param {string} issuerEntityId - The issuer entity ID
   * @param {string} receiverEntityId - The receiver entity ID
   * @param {string} shakeType - The shake type
   * @returns {Promise<Object>} Interoperability result
   */
  async checkInteroperability(issuerEntityId, receiverEntityId, shakeType) {
    return this.client.checkInteroperability(issuerEntityId, receiverEntityId, shakeType);
  }

  // =========================================================================
  // STATUS AND USAGE
  // =========================================================================

  /**
   * Get SDK status
   * @returns {Promise<Object>} Status info
   */
  async getStatus() {
    return this.client.getStatus();
  }

  /**
   * Get usage statistics
   * @returns {Promise<Object>} Usage stats
   */
  async getUsageStats() {
    return this.client.getUsageStats();
  }

  /**
   * Get pricing information
   * @returns {Promise<Object>} Pricing info
   */
  async getPricing() {
    return this.client.getPricing();
  }

  // =========================================================================
  // CACHE MANAGEMENT
  // =========================================================================

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return this.client.getCacheStats();
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.client.clearCache();
  }

  /**
   * Invalidate a specific proof token from cache
   * @param {string} proofToken - Token to invalidate
   */
  invalidate(proofToken) {
    this.client.invalidate(proofToken);
  }
}

// ===========================================================================
// AI PLATFORM INTEGRATIONS
// ===========================================================================

/**
 * Claude-specific integration helper
 *
 * Extends ShukaSDK with Claude-formatted responses for tool use.
 */
class ClaudeIntegration extends ShukaSDK {
  constructor(config = {}) {
    super({ ...config, agentName: config.agentName || 'claude' });
  }

  /**
   * Create attestation formatted for Claude tool response
   * @param {string} description - What to attest
   * @param {Object} [options] - Attestation options
   * @returns {Promise<Object>} Claude-formatted result
   */
  async attestForClaude(description, options = {}) {
    const result = await this.attest(description, options);

    return {
      success: result.success,
      proof_token: result.proof_token,
      handshake_id: result.handshake_id,
      trust_score: result.trust_score,
      action: result.success
        ? 'Attestation created. Share the proof_token for verification.'
        : 'Attestation failed. Check error details.',
      verify_url: result.proof_token
        ? `https://shuka.app/verify?token=${encodeURIComponent(result.proof_token)}`
        : null
    };
  }

  /**
   * Verify proof formatted for Claude tool response
   * @param {string} proofToken - The proof token
   * @returns {Promise<Object>} Claude-formatted result
   */
  async verifyForClaude(proofToken) {
    const result = await this.verify(proofToken);

    // Proof tokens return { valid, proof }; envelopes return { success, envelope }
    const verified = result.valid === true || result.success === true;
    const trustScore = result.proof?.trust_score ?? result.envelope?.trust_score ?? null;
    return {
      verification_result: verified ? 'VERIFIED' : 'NOT_VERIFIED',
      trust_score: trustScore,
      action: verified
        ? `Trust score ${trustScore}. ${trustScore >= 0.8 ? 'Safe to proceed.' : 'Proceed with caution.'}`
        : 'Do not proceed. Verification failed.',
      details: result
    };
  }

  /**
   * Negotiate trust formatted for Claude tool response
   * @param {string} proofToken - The proof token
   * @param {string} [purpose] - Why verifying
   * @returns {Promise<Object>} Claude-formatted result
   */
  async negotiateForClaude(proofToken, purpose) {
    const result = await this.negotiate(proofToken, purpose);

    return {
      vouched: result.vouched,
      recommendation: result.recommendation,
      trust_score: result.trust_score,
      action: this._recommendationToAction(result.recommendation),
      evidence: result.evidence
    };
  }

  _recommendationToAction(recommendation) {
    const actions = {
      'safe_to_proceed': 'You may proceed with this data exchange.',
      'proceed_with_caution': 'Proceed carefully. Consider additional verification.',
      'additional_verification_recommended': 'Request additional proof before proceeding.',
      'do_not_proceed': 'Do not proceed. Trust verification failed.'
    };
    return actions[recommendation] || 'Unknown recommendation. Exercise caution.';
  }
}

/**
 * OpenAI/ChatGPT-specific integration helper
 *
 * Extends ShukaSDK with GPT function calling formatted responses.
 */
class ChatGPTIntegration extends ShukaSDK {
  constructor(config = {}) {
    super({ ...config, agentName: config.agentName || 'gpt-4' });
  }

  /**
   * Create attestation formatted for GPT function response
   * @param {string} description - What to attest
   * @param {Object} [options] - Attestation options
   * @returns {Promise<Object>} GPT-formatted result
   */
  async attestForGPT(description, options = {}) {
    const result = await this.attest(description, options);

    return {
      status: result.success ? 'success' : 'error',
      data: {
        proof_token: result.proof_token,
        handshake_id: result.handshake_id,
        trust_score: result.trust_score
      },
      instructions: result.success
        ? { action: 'share_proof', message: 'Share proof_token with recipient for verification' }
        : { action: 'retry', message: result.error || 'Attestation failed' }
    };
  }

  /**
   * Verify proof formatted for GPT function response
   * @param {string} proofToken - The proof token
   * @returns {Promise<Object>} GPT-formatted result
   */
  async verifyForGPT(proofToken) {
    const result = await this.verify(proofToken);

    // Proof tokens return { valid, proof }; envelopes return { success, envelope }
    const verified = result.valid === true || result.success === true;
    const proof = result.proof || result.envelope || {};
    return {
      status: verified ? 'verified' : 'not_verified',
      data: {
        trust_score: proof.trust_score,
        handshake_id: proof.handshake_id,
        created_at: proof.created_at
      },
      instructions: {
        action: verified ? 'proceed' : 'deny',
        trust_level: proof.trust_score >= 0.8 ? 'high' : proof.trust_score >= 0.6 ? 'medium' : 'low'
      }
    };
  }

  /**
   * Negotiate trust formatted for GPT function response
   * @param {string} proofToken - The proof token
   * @param {string} [purpose] - Why verifying
   * @returns {Promise<Object>} GPT-formatted result
   */
  async negotiateForGPT(proofToken, purpose) {
    const result = await this.negotiate(proofToken, purpose);

    return {
      status: result.vouched ? 'vouched' : 'not_vouched',
      data: {
        recommendation: result.recommendation,
        trust_score: result.trust_score,
        evidence: result.evidence
      },
      instructions: {
        action: result.recommendation,
        should_proceed: result.recommendation === 'safe_to_proceed'
      }
    };
  }
}

// ===========================================================================
// MIDDLEWARE FACTORY
// ===========================================================================

/**
 * Create middleware function for any AI system
 *
 * Returns a function that can be used as middleware in your AI pipeline.
 * The middleware verifies proofs and returns trust decisions.
 *
 * @param {Object} config - Configuration (apiKey required)
 * @returns {Function} Middleware function (proofToken, purpose) => Promise<{shouldProceed, ...}>
 *
 * @example
 * const trustMiddleware = createShukaMiddleware({ apiKey: '...' });
 *
 * // In your agent pipeline
 * const trust = await trustMiddleware(incomingProofToken, 'processing patient data');
 * if (trust.shouldProceed) {
 *   // Safe to act on the data
 * }
 */
function createShukaMiddleware(config = {}) {
  const shuka = new ShukaSDK(config);

  return async (proofToken, purpose = 'trust verification') => {
    const result = await shuka.negotiate(proofToken, purpose);

    return {
      shouldProceed: result.recommendation === 'safe_to_proceed',
      recommendation: result.recommendation,
      trustScore: result.trust_score,
      vouched: result.vouched,
      evidence: result.evidence,
      raw: result
    };
  };
}

/**
 * Create attestation middleware for outbound data
 *
 * Returns a function that wraps data with a Shuka attestation.
 *
 * @param {Object} config - Configuration (apiKey required)
 * @returns {Function} Middleware function (description, metadata) => Promise<{data, proofToken, ...}>
 */
function createAttestationMiddleware(config = {}) {
  const shuka = new ShukaSDK(config);

  return async (description, options = {}) => {
    const result = await shuka.attest(description, options);

    return {
      success: result.success,
      proofToken: result.proof_token,
      handshakeId: result.handshake_id,
      trustScore: result.trust_score,
      raw: result
    };
  };
}

// ===========================================================================
// EXPORTS
// ===========================================================================

module.exports = {
  // Main SDK class - Universal Trust Guardian
  ShukaSDK,

  // AI platform integrations
  ClaudeIntegration,
  ChatGPTIntegration,

  // Middleware factories
  createShukaMiddleware,
  createAttestationMiddleware,

  // Error class
  ShukaSDKError
};
