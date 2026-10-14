/**
 * @shukashake/agent - Universal Trust Guardian for AI Agents
 *
 * The Shuka Shake is the trust layer for moving protected data in the AI economy.
 * It doesn't own what's inside - it guards the exchange, respects confidentiality,
 * and enforces terms without ever touching the metadata within.
 *
 * @packageDocumentation
 */

// Re-export everything from client
export {
  ShukaClient,
  ShukaClientError,
  ShukaClientConfig,
  ShukaClientErrorDetails,
  AttestationCache,
  RequestDeduplicator,
  CacheStats,
  CombinedCacheStats,
  getClient,
  resetClient,
  HandshakeType,
  HandshakeTypeValue,
  HandshakeStatus,
  HandshakeStatusValue,
  TrustRecommendation,
  TrustRecommendationValue,
  Industry,
  IndustryValue,
  TTL,
  AttestationOptions,
  AttestationResult,
  CreateHandshakeData,
  VerificationResult,
  NegotiationResult,
  DiscoveryFilters,
  DiscoveryResult,
  RegistryEntry,
  InteropResult,
  TemplateFilters,
  // Terms and conditions types
  AccessType,
  AccessTypeValue,
  TermsStatus,
  TermsStatusValue,
  DelegationLevel,
  DelegationLevelValue,
  TermsOptions,
  TermsResult,
  TermsAcceptanceOptions,
  TermsAcceptanceResult,
  AccessCheckOptions,
  AccessCheckResult,
  RevocationOptions,
  RevocationResult,
  TermsUpdateOptions,
  // One Ring / marketplace / enterprise / rules layer types (v2.1.0)
  IdempotentShakeOptions,
  LicenseSearchFilters,
  LicenseOffering,
  AcquireLicenseOptions,
  EnterpriseLicenseFilters,
  EnterpriseAcquisitionParams,
  SdkTermsDefinition,
  SdkTermsRevokeOptions,
  SdkTermsAccessOptions
} from './client';

// Re-export everything from SDK
export {
  ShukaSDK,
  ShukaSDKError,
  ShukaSDKConfig,
  ShukaSDKErrorDetails,
  ClaudeIntegration,
  ClaudeAttestationResult,
  ClaudeVerificationResult,
  ClaudeNegotiationResult,
  ChatGPTIntegration,
  GPTAttestationResult,
  GPTVerificationResult,
  GPTNegotiationResult,
  createShukaMiddleware,
  createAttestationMiddleware,
  MiddlewareVerifyResult,
  MiddlewareAttestResult
} from './sdk';

// Re-export everything from MCP
export {
  createMCPServer,
  createStdioServer,
  TOOLS as MCP_TOOLS,
  RESOURCES as MCP_RESOURCES,
  handleToolCall,
  handleResourceRead,
  MCPTool,
  MCPResource,
  MCPToolResult,
  MCPResourceResult,
  MCPServer,
  ShukaMCPToolName
} from './mcp';

/** Default export is ShukaSDK */
declare const _default: typeof import('./sdk').ShukaSDK;
export default _default;
