/**
 * Shuka MCP Server TypeScript Declarations
 * @packageDocumentation
 */

import { ShukaClient } from './client';

/** MCP Tool definition */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/** MCP Resource definition */
export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/** MCP Tool call result */
export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/** MCP Resource read result */
export interface MCPResourceResult {
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}

/** MCP Server instance */
export interface MCPServer {
  name: string;
  version: string;
  capabilities: {
    tools: Record<string, any>;
    resources: Record<string, any>;
  };
  tools: MCPTool[];
  resources: MCPResource[];
  handleToolCall: (name: string, args: Record<string, any>) => Promise<MCPToolResult>;
  handleResourceRead: (uri: string) => Promise<MCPResourceResult>;
  client: ShukaClient;
}

/** Names of the united Shuka MCP tools (v2.1.0) */
export type ShukaMCPToolName =
  // One Ring shakes
  | 'create_idempotent_shake'
  | 'lookup_shake'
  | 'verify_shake'
  // Attestation (legacy-compatible)
  | 'create_attestation'
  | 'verify_proof'
  | 'negotiate_trust'
  // Marketplace
  | 'browse_marketplace'
  | 'issue_license'
  | 'purchase_license'
  | 'verify_grant'
  // Enterprise
  | 'enterprise_licenses'
  // Rules layer
  | 'manage_terms'
  // Registry
  | 'registry';

/** Available MCP tools */
export declare const TOOLS: MCPTool[];

/** Available MCP resources */
export declare const RESOURCES: MCPResource[];

/**
 * Handle an MCP tool call
 */
export declare function handleToolCall(
  name: string,
  args: Record<string, any>
): Promise<MCPToolResult>;

/**
 * Handle an MCP resource read
 */
export declare function handleResourceRead(uri: string): Promise<MCPResourceResult>;

/**
 * Create an MCP server instance for custom transports
 */
export declare function createMCPServer(): MCPServer;

/**
 * Create and run MCP server with stdio transport
 * This is the main entry point for Claude Desktop integration
 */
export declare function createStdioServer(): Promise<any>;
