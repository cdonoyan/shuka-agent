/**
 * @shukashake/agent - Universal Trust Guardian for AI Agents
 *
 * The Shuka Shake is the trust layer for moving protected data in the AI economy.
 * It doesn't own what's inside - it guards the exchange, respects confidentiality,
 * and enforces terms without ever touching the metadata within.
 *
 * This package is your agent's membership to the yacht club - where trust is
 * negotiated, proof tokens are exchanged, and data flows with respect for rights.
 *
 * @example
 * // Quick start - create and verify attestations
 * const { ShukaSDK } = require('@shukashake/agent');
 *
 * const shuka = new ShukaSDK({ apiKey: process.env.SHUKA_API_KEY });
 *
 * // Create an attestation (the Shuka Shake)
 * const result = await shuka.attest(
 *   'Patient John Doe consents to release records to Dr. Smith',
 *   { industry: 'healthcare', jurisdiction: 'US' }
 * );
 *
 * // Share the proof token - portable, verifiable, universal
 * console.log(result.proof_token); // shk_v1.xxx.yyy
 *
 * @example
 * // Agent-to-agent trust negotiation
 * const trust = await shuka.negotiate(incomingProofToken, 'processing patient data');
 *
 * if (trust.recommendation === 'safe_to_proceed') {
 *   // The data exchange is trusted - proceed
 * }
 *
 * @example
 * // Discovery - find who can issue/accept specific shake types
 * const registries = await shuka.client.discoverRegistries({
 *   industry: 'healthcare',
 *   shakeType: 'release_of_information'
 * });
 *
 * @author Auron
 * @version 2.1.1
 * @see https://shuka.app
 * @license MIT
 */

// Core client with caching, deduplication, and full API access
const {
  ShukaClient,
  ShukaClientError,
  AttestationCache,
  RequestDeduplicator,
  getClient,
  resetClient,
  HandshakeType,
  HandshakeStatus,
  TrustRecommendation,
  Industry,
  AccessType,
  TermsStatus,
  DelegationLevel,
  TTL
} = require('./client');

// High-level SDK with ergonomic methods for agents
const {
  ShukaSDK,
  ClaudeIntegration,
  ChatGPTIntegration,
  createShukaMiddleware,
  createAttestationMiddleware,
  ShukaSDKError
} = require('./sdk');

// MCP server for Claude Desktop integration
const {
  createMCPServer,
  createStdioServer,
  TOOLS: MCP_TOOLS,
  RESOURCES: MCP_RESOURCES,
  handleToolCall,
  handleResourceRead
} = require('./mcp');

// ===========================================================================
// MAIN EXPORTS
// ===========================================================================

module.exports = {
  // =========================================================================
  // PRIMARY SDK CLASS - Start here
  // =========================================================================

  /**
   * Main SDK class for AI agent integration.
   * Use this for most operations.
   *
   * @example
   * const shuka = new ShukaSDK({ apiKey: '...' });
   * const result = await shuka.attest('My claim', { industry: 'healthcare' });
   */
  ShukaSDK,

  // =========================================================================
  // AI PLATFORM INTEGRATIONS
  // =========================================================================

  /**
   * Claude-specific integration with Claude-formatted responses.
   *
   * @example
   * const claude = new ClaudeIntegration({ apiKey: '...' });
   * const result = await claude.attestForClaude('My claim');
   */
  ClaudeIntegration,

  /**
   * ChatGPT/OpenAI-specific integration with GPT function calling format.
   *
   * @example
   * const gpt = new ChatGPTIntegration({ apiKey: '...' });
   * const result = await gpt.attestForGPT('My claim');
   */
  ChatGPTIntegration,

  // =========================================================================
  // LOW-LEVEL CLIENT - Direct API access
  // =========================================================================

  /**
   * Low-level HTTP client with caching and deduplication.
   * Use this when you need direct API access or custom workflows.
   *
   * @example
   * const client = new ShukaClient({ apiKey: '...', agentId: 'my-agent' });
   * const registries = await client.discoverRegistries({ industry: 'construction' });
   * const interop = await client.checkInteroperability('entity-a', 'entity-b', 'compliance');
   */
  ShukaClient,

  /**
   * Get the singleton client instance.
   *
   * @example
   * const client = getClient({ apiKey: '...' });
   */
  getClient,

  /**
   * Reset the singleton client (useful for testing).
   */
  resetClient,

  // =========================================================================
  // MIDDLEWARE FACTORIES
  // =========================================================================

  /**
   * Create verification middleware for incoming data.
   *
   * @example
   * const verify = createShukaMiddleware({ apiKey: '...' });
   * const trust = await verify(incomingProofToken, 'processing request');
   * if (trust.shouldProceed) { ... }
   */
  createShukaMiddleware,

  /**
   * Create attestation middleware for outbound data.
   *
   * @example
   * const attest = createAttestationMiddleware({ apiKey: '...' });
   * const proof = await attest('My claim', { industry: 'finance' });
   * // Include proof.proofToken in your response
   */
  createAttestationMiddleware,

  // =========================================================================
  // MCP SERVER (Claude Desktop)
  // =========================================================================

  /**
   * Create an MCP server instance for custom transports.
   *
   * @example
   * const server = createMCPServer();
   * // Use with your own transport
   */
  createMCPServer,

  /**
   * Create and run MCP server with stdio transport.
   * This is the main entry point for Claude Desktop integration.
   *
   * @example
   * // Run as CLI: npx @shukashake/agent/mcp
   * createStdioServer();
   */
  createStdioServer,

  // MCP internals (for advanced usage)
  MCP_TOOLS,
  MCP_RESOURCES,
  handleToolCall,
  handleResourceRead,

  // =========================================================================
  // ERROR CLASSES
  // =========================================================================

  /**
   * Client-level error (network, auth, payment).
   */
  ShukaClientError,

  /**
   * SDK-level error (validation, configuration).
   */
  ShukaSDKError,

  // =========================================================================
  // ENUMS AND CONSTANTS
  // =========================================================================

  /**
   * Handshake types supported by Shuka.
   *
   * @example
   * await client.createHandshake({
   *   handshakeType: HandshakeType.RELEASE_OF_INFORMATION,
   *   ...
   * });
   */
  HandshakeType,

  /**
   * Handshake status values.
   */
  HandshakeStatus,

  /**
   * Trust recommendation levels from agent negotiation.
   *
   * @example
   * if (result.recommendation === TrustRecommendation.SAFE_TO_PROCEED) {
   *   // Proceed with the data exchange
   * }
   */
  TrustRecommendation,

  /**
   * Industry contexts.
   *
   * @example
   * await shuka.attest('Claim', { industry: Industry.HEALTHCARE });
   */
  Industry,

  /**
   * Terms access types (rules layer).
   */
  AccessType,

  /**
   * Terms lifecycle status values.
   */
  TermsStatus,

  /**
   * Delegation levels for terms permissions.
   */
  DelegationLevel,

  /**
   * Cache TTL values (in milliseconds).
   */
  TTL,

  // =========================================================================
  // CACHE UTILITIES (for advanced usage)
  // =========================================================================

  AttestationCache,
  RequestDeduplicator,

  // =========================================================================
  // DEFAULT EXPORT
  // =========================================================================

  default: ShukaSDK
};
