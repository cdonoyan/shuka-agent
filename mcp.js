#!/usr/bin/env node

/**
 * Shuka MCP Server - Universal Trust Guardian for AI Agents
 *
 * The UNITED Shuka surface: everything is a Shuka Shake. Attestation,
 * the rules layer (terms), the shake-anchored marketplace, enterprise
 * licensing, and the append-only registry are ONE flow, not separate
 * destinations:
 *
 *   shake -> terms -> offering -> grant -> registry proof
 *
 * Tool groups:
 * - One Ring shakes: create_idempotent_shake (RECOMMENDED), lookup_shake, verify_shake
 * - Attestation (legacy-compatible): create_attestation, verify_proof, negotiate_trust
 * - Marketplace: browse_marketplace, issue_license, purchase_license, verify_grant
 * - Enterprise: enterprise_licenses
 * - Rules layer: manage_terms
 * - Registry: registry
 *
 * Resources:
 * - attestation://{proof_token}: Look up attestation details
 * - grant://{grant_id}: Verify a marketplace grant against the registry ledger
 *
 * Auth: SDK key only (SHUKA_API_KEY env var). Get one at
 * https://shuka.app/dashboard/api-keys
 *
 * Uses the shared ShukaClient for caching and request deduplication.
 *
 * @author Auron
 * @version 2.1.1
 * @see https://shuka.app
 */

const { ShukaClient } = require('./client');

const VERSION = '2.1.1';

// Initialize shared client (benefits from caching)
const client = new ShukaClient({
  agentId: 'shuka-mcp-server'
});

/**
 * Tool definitions for MCP
 */
const TOOLS = [
  // ===========================================================================
  // ONE RING IDEMPOTENT SHAKES — the entry point of the united flow
  // ===========================================================================
  {
    name: 'create_idempotent_shake',
    description: `Create or retrieve an idempotent Shuka shake. RECOMMENDED for most use cases.

The One Ring: Same entity_data always returns the same shake. This is the magic
that enables AI agents to repeatedly attest to the same data without creating
duplicates - critical for enterprise integrations.

This shake is the anchor for EVERYTHING else in the united flow: attach terms
(manage_terms), issue a marketplace offering from it (issue_license), and its
lifecycle is recorded in the registry (registry).

Use this when you need to:
- Attest to data that may be referenced multiple times
- Create portable proofs that persist across sessions
- Ensure billing accuracy (only charged on first creation)
- Build reliable audit trails without duplicate entries

Returns the shake with was_created=true (new) or was_created=false (existing).`,
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          description: "Category of entity being attested (e.g., 'medical_record', 'contract', 'license', 'compliance_check')",
        },
        entity_data: {
          type: 'object',
          description: 'The data being attested - used to generate deterministic entity_id. Same data = same shake.',
        },
        purpose: {
          type: 'string',
          description: 'Human-readable purpose of this shake',
        },
        industry: {
          type: 'string',
          enum: ['healthcare', 'construction', 'finance', 'legal', 'government', 'sdk', 'universal'],
          description: "Industry context (default: 'sdk')",
        },
        handshake_type: {
          type: 'string',
          enum: ['attestation', 'verification', 'transfer', 'consent'],
          description: "Type of attestation (default: 'attestation')",
        },
        expires_in_days: {
          type: 'number',
          description: 'Days until expiration (default: 365)',
        },
      },
      required: ['entity_type', 'entity_data', 'purpose'],
    },
  },
  {
    name: 'lookup_shake',
    description: `Look up an existing shake by entity identifiers.

Use this to check if a shake already exists before creating a new one,
or to retrieve shake details for data you've previously attested.

Returns the shake if found, or null if not found.`,
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          description: 'Category of entity',
        },
        entity_data: {
          type: 'object',
          description: 'The entity data (used to derive entity_id)',
        },
      },
      required: ['entity_type', 'entity_data'],
    },
  },
  {
    name: 'verify_shake',
    description: `Verify a shake by its ID and get trust information.

Use this to confirm a shake is valid and check its trust score
before proceeding with a data exchange.`,
    inputSchema: {
      type: 'object',
      properties: {
        shake_id: {
          type: 'string',
          description: 'The handshake ID to verify',
        },
      },
      required: ['shake_id'],
    },
  },

  // ===========================================================================
  // ATTESTATION — legacy-compatible tools (unchanged since v2.0.0)
  // ===========================================================================
  {
    name: 'create_attestation',
    description: `Create a verifiable Shuka attestation for any claim or data.

Use this when you need to:
- Prove a claim is true with cryptographic certainty
- Create an audit trail for data being shared
- Attest to compliance, consent, or authorization
- Generate a portable proof that other agents can verify

Returns a proof token (shk_v1.xxx.yyy) that anyone can verify.
Include industry/jurisdiction context directly in the description text —
the attestation records the text and optional terms.`,
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'What you are attesting to. Be specific and clear; include industry and jurisdiction context in the text.',
        },
        terms: {
          type: 'object',
          description: 'Optional access terms: access_type (single_use|time_limited|use_limited|perpetual|session_bound|windowed), validity_days, require_receipt, permitted_purposes, prohibited_purposes',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'verify_proof',
    description: `Verify a Shuka proof token and get details about the attestation.

Use this when you:
- Receive a proof token and need to confirm it's valid
- Want to check the trust score before proceeding
- Need to see what was attested and when
- Want to verify claims before acting on data

Proof tokens look like: shk_v1.YWJjMTIz.a1b2c3 or ENV-xxx`,
    inputSchema: {
      type: 'object',
      properties: {
        proof_token: {
          type: 'string',
          description: 'The Shuka proof token to verify (shk_v1.xxx.yyy or ENV-xxx format)',
        },
      },
      required: ['proof_token'],
    },
  },
  {
    name: 'negotiate_trust',
    description: `Perform agent-to-agent trust negotiation with Shuka as the arbiter.

Use this when:
- Another agent presents a proof and you need Shuka to vouch for it
- You need a recommendation on whether to proceed with a data exchange
- You want detailed validation evidence before trusting external data

Returns a recommendation: safe_to_proceed, proceed_with_caution,
additional_verification_recommended, or do_not_proceed.

NOTE: negotiation is a billable operation (standard shake rate). An
invalid proof is rejected by a free pre-check before any charge.`,
    inputSchema: {
      type: 'object',
      properties: {
        proof_token: {
          type: 'string',
          description: 'The proof token to verify',
        },
        purpose: {
          type: 'string',
          description: 'Why you need to verify this (provides context for the trust decision)',
        },
      },
      required: ['proof_token'],
    },
  },

  // ===========================================================================
  // MARKETPLACE — shake-anchored offerings and grants
  // ===========================================================================
  {
    name: 'browse_marketplace',
    description: `Browse the shake-anchored license marketplace.

Every offering in the marketplace is anchored to a Shuka shake that proves
the underlying rights. Without a license_id this searches offerings; with a
license_id it returns full details plus a validation check.

Use this to:
- Discover license offerings by keyword or brand
- Inspect a specific offering before purchasing (purchase_license)
- Confirm an offering is real, active, and in good standing`,
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Free-text search across offerings',
        },
        brand: {
          type: 'string',
          description: 'Filter by brand name',
        },
        license_id: {
          type: 'string',
          description: 'A specific license ID - returns full details plus validation instead of search results',
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
        },
        per_page: {
          type: 'number',
          description: 'Results per page (max 50)',
        },
      },
    },
  },
  {
    name: 'issue_license',
    description: `Issue a license offering anchored to one of YOUR handshakes (shakes).

The united flow: your shake proves the underlying rights; the offering is
issued FROM that shake; buyers purchase grants against it; every event is
recorded in the append-only registry.

Requires an SDK key with license:write permission and an issuer-capable
account (Partner/Admin). Get keys at https://shuka.app/dashboard/api-keys

Use this to:
- Turn an attested asset (voice likeness, IP, dataset rights) into a sellable offering
- Set pricing, permitted/prohibited uses, royalties, and grant caps`,
    inputSchema: {
      type: 'object',
      properties: {
        anchor_handshake_id: {
          type: 'string',
          description: 'The shake (handshake ID) that anchors this offering - must belong to you',
        },
        brand: {
          type: 'string',
          description: 'Brand / title of the offering',
        },
        rights_holder: {
          type: 'string',
          description: 'Legal rights holder name',
        },
        valid_until: {
          type: 'string',
          description: 'Expiry date (ISO format, e.g. 2027-12-31)',
        },
        buy_to_open_price: {
          type: 'number',
          description: 'Price to purchase a grant',
        },
        permitted_uses: {
          type: 'array',
          items: { type: 'string' },
          description: 'What grant holders may do',
        },
        prohibited_uses: {
          type: 'array',
          items: { type: 'string' },
          description: 'What grant holders may not do',
        },
        max_grants: {
          type: 'number',
          description: 'Maximum number of grants that can be sold',
        },
        royalty_percentage: {
          type: 'number',
          description: 'Royalty percent recorded in contract terms',
        },
        royalty_cap_usd: {
          type: 'number',
          description: 'Royalty cap in USD',
        },
        platform_fee_percentage: {
          type: 'number',
          description: 'Platform fee percent',
        },
        image_url: {
          type: 'string',
          description: 'Offering image URL',
        },
      },
      required: ['anchor_handshake_id', 'brand', 'rights_holder', 'valid_until'],
    },
  },
  {
    name: 'purchase_license',
    description: `Purchase a license from the marketplace (creates a grant).

Returns the transaction, portfolio entry, and the attestation (handshake +
proof_token) anchoring the grant to the registry ledger. The proof_token
is portable - any agent can verify it with verify_proof.

Acquisition is idempotent per buyer+license: a replay returns 409 with no
double charge; a license you already own returns 409 already_owned; a
payment_amount that doesn't match the current list price returns 400
carrying license_price.

Use this to:
- Acquire usage rights for an offering found via browse_marketplace
- Get a cryptographic proof of your grant for downstream agents`,
    inputSchema: {
      type: 'object',
      properties: {
        license_id: {
          type: 'string',
          description: 'The license/offering ID to acquire',
        },
        payment_amount: {
          type: 'number',
          description: 'Payment amount (must match the offering price)',
        },
      },
      required: ['license_id', 'payment_amount'],
    },
  },
  {
    name: 'verify_grant',
    description: `Verify a marketplace grant against the append-only registry ledger.

Returns the grant status, the anchoring license offering, the attestation,
and the integrity of the ledger chain. This is how any agent confirms a
grant is real, active, and unrevoked - without trusting the grant holder.

Use this when:
- Another party claims to hold a license grant
- You need to confirm a grant before honoring its permitted uses`,
    inputSchema: {
      type: 'object',
      properties: {
        grant_id: {
          type: 'string',
          description: 'The grant ID to verify (GRANT-...)',
        },
      },
      required: ['grant_id'],
    },
  },

  // ===========================================================================
  // ENTERPRISE LICENSING
  // ===========================================================================
  {
    name: 'enterprise_licenses',
    description: `Browse enterprise (multi-seat) license offerings.

action="browse": list enterprise offerings (filter by brand, min_seats, max_price).
action="acquire": NOT CURRENTLY AVAILABLE — the enterprise seat model is not
built yet and the backend returns 501 not_implemented. Use purchase_license
for single-grant acquisitions.`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['browse', 'acquire'],
          description: 'browse: list enterprise offerings. acquire: currently returns 501 not_implemented.',
        },
        brand: {
          type: 'string',
          description: '(browse) Filter by brand',
        },
        min_seats: {
          type: 'number',
          description: '(browse) Minimum seats needed',
        },
        max_price: {
          type: 'number',
          description: '(browse) Maximum price',
        },
        license_id: {
          type: 'string',
          description: '(acquire) The enterprise license ID',
        },
        seats_needed: {
          type: 'number',
          description: '(acquire) Number of seats to acquire',
        },
      },
      required: ['action'],
    },
  },

  // ===========================================================================
  // RULES LAYER — modifiable terms on immutable handshakes
  // ===========================================================================
  {
    name: 'manage_terms',
    description: `Manage the rules layer: modifiable terms riding on immutable handshakes.

The shake never changes; the terms on it can be amended, re-priced, or
revoked WITHOUT re-attesting. This is how user IP stays under the owner's
control after attestation.

Actions (all require an SDK key assigned to a user; most are billable):
- create: attach terms to a handshake (requires handshake_id; access_type
  defaults to perpetual; 409 terms_exist if the handshake already has terms;
  needs license:write, $0.05)
- get: fetch terms by terms_id
- update: amend terms (updates MUST include change_reason or the backend
  400s; new revision recorded; needs license:write, $0.03)
- revoke: revoke terms (reason is REQUIRED; needs license:write, $0.02)
- record_access: log an access under the terms (creates a receipt; purpose
  must be in permitted_purposes when those are set; needs license:read, $0.01)
- revisions: amendment history for terms
- receipts: access receipts (audit trail) for terms
- by_handshake: get the current terms attached to a handshake`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'get', 'update', 'revoke', 'record_access', 'revisions', 'receipts', 'by_handshake'],
          description: 'The terms operation to perform',
        },
        handshake_id: {
          type: 'string',
          description: '(create, by_handshake) The handshake the terms ride on',
        },
        terms_id: {
          type: 'string',
          description: '(get, update, revoke, record_access, revisions, receipts) The terms ID',
        },
        access_type: {
          type: 'string',
          enum: ['single_use', 'time_limited', 'use_limited', 'perpetual', 'session_bound', 'windowed'],
          description: '(create) How the data may be accessed',
        },
        access_config: {
          type: 'object',
          description: '(create) Access-type-specific config (e.g. valid_until, max_uses)',
        },
        permitted_purposes: {
          type: 'array',
          items: { type: 'string' },
          description: '(create) Purposes the data may be used for',
        },
        prohibited_purposes: {
          type: 'array',
          items: { type: 'string' },
          description: '(create) Purposes the data may NOT be used for',
        },
        updates: {
          type: 'object',
          description: '(update) Fields to change — MUST include change_reason (backend rejects without it)',
        },
        reason: {
          type: 'string',
          description: '(revoke) Why the terms are being revoked — REQUIRED for revoke',
        },
        accessor_id: {
          type: 'string',
          description: '(record_access) Who accessed (defaults to this agent)',
        },
        purpose: {
          type: 'string',
          description: '(record_access) Why the data was accessed',
        },
      },
      required: ['action'],
    },
  },

  // ===========================================================================
  // REGISTRY — append-only ledger + interoperability
  // ===========================================================================
  {
    name: 'registry',
    description: `Query the Shuka registry: the append-only ledger and interoperability layer.

Actions:
- history: full chronological ledger history for an entity (requires entity_type + entity_id)
- discover: find registries by industry / shake_type
- lookup: look up a registry entity by entity_id
- can_issue: check whether an entity can issue a shake type (requires entity_id + shake_type)
- will_accept: check whether an entity accepts a shake type from an issuer (requires entity_id + shake_type + issuer_id)
- interop_check: full issuer-to-receiver interoperability check (requires issuer_id + receiver_id + shake_type)

Use this to trace provenance (every license and grant event is in the ledger)
and to confirm two parties can exchange a given shake type BEFORE attempting it.`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['history', 'discover', 'lookup', 'can_issue', 'will_accept', 'interop_check'],
          description: 'The registry operation to perform',
        },
        entity_type: {
          type: 'string',
          description: "(history) Ledger entity type (e.g. 'license', 'grant')",
        },
        entity_id: {
          type: 'string',
          description: '(history, lookup, can_issue, will_accept) The entity ID',
        },
        industry: {
          type: 'string',
          description: '(discover) Filter registries by industry',
        },
        shake_type: {
          type: 'string',
          description: '(discover, can_issue, will_accept, interop_check) The shake type in question',
        },
        issuer_id: {
          type: 'string',
          description: '(will_accept, interop_check) The issuer entity ID',
        },
        receiver_id: {
          type: 'string',
          description: '(interop_check) The receiver entity ID',
        },
      },
      required: ['action'],
    },
  },
];

/**
 * Resource definitions for MCP
 */
const RESOURCES = [
  {
    uri: 'attestation://example',
    name: 'Attestation Lookup',
    description: 'Look up any Shuka attestation by its proof token. Replace "example" with the actual proof token (e.g., attestation://shk_v1.xxx.yyy)',
    mimeType: 'application/json',
  },
  {
    uri: 'grant://example',
    name: 'Grant Verification',
    description: 'Verify any marketplace grant against the registry ledger. Replace "example" with the actual grant ID (e.g., grant://GRANT-abc123)',
    mimeType: 'application/json',
  },
];

/**
 * Wrap a successful result as MCP tool content
 */
function toolResult(data) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Turn an error into an actionable MCP tool error
 */
function toolError(error) {
  const message = error.message || String(error);
  let hint;

  const status = (error.details && error.details.status) || null;
  if (error.code === 'INVALID_API_KEY' || status === 401 || message.includes('(401)')) {
    hint = 'SDK key missing or invalid. Set the SHUKA_API_KEY environment variable. Get a key at https://shuka.app/dashboard/api-keys';
  } else if (error.code === 'PAYMENT_REQUIRED' || status === 402 || message.includes('(402)')) {
    hint = 'Payment required. Add credits at https://shuka.app/partner/billing';
  } else if (message.includes('(403)')) {
    hint = 'Permission denied. Your SDK key may lack the required permission (e.g. license:write) or your account role cannot perform this action. Manage keys at https://shuka.app/dashboard/api-keys';
  } else if (message.includes('(404)')) {
    hint = 'Not found. Check the ID - shakes, licenses, grants, and terms IDs are case-sensitive.';
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(hint ? { error: message, hint } : { error: message }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Handle tool calls
 */
async function handleToolCall(name, args) {
  try {
    switch (name) {
      // =====================================================================
      // ONE RING SHAKES
      // =====================================================================
      case 'create_idempotent_shake': {
        const { entity_type, entity_data, purpose, industry, handshake_type, expires_in_days } = args;
        const result = await client.createIdempotentShake(entity_type, entity_data, {
          purpose,
          industry,
          handshakeType: handshake_type,
          expiresInDays: expires_in_days,
        });
        return toolResult(result);
      }

      case 'lookup_shake': {
        const { entity_type, entity_data } = args;
        const result = await client.lookupShake(entity_type, entity_data);
        return toolResult(result);
      }

      case 'verify_shake': {
        const { shake_id } = args;
        const result = await client.verifyShake(shake_id);
        return toolResult(result);
      }

      // =====================================================================
      // ATTESTATION (legacy-compatible)
      // =====================================================================
      case 'create_attestation': {
        const { description, terms } = args;

        const result = await client.createAttestation(description, { terms });

        return toolResult({
          success: true,
          proof_token: result.proof_token,
          trust_score: result.trust_score,
          handshake_id: result.handshake_id,
          validation: result.validation,
          summary: result.summary || description,
          message: 'Attestation created successfully. Share the proof_token with others to prove this claim.',
          verify_url: `https://shuka.app/verify?token=${encodeURIComponent(result.proof_token || '')}`,
        });
      }

      case 'verify_proof': {
        const { proof_token } = args;

        // Uses cached verification from ShukaClient
        const result = await client.verify(proof_token);
        return toolResult(result);
      }

      case 'negotiate_trust': {
        const { proof_token, purpose } = args;

        // Uses cached verification + smart negotiation from ShukaClient
        const result = await client.negotiate(proof_token, purpose);
        return toolResult(result);
      }

      // =====================================================================
      // MARKETPLACE
      // =====================================================================
      case 'browse_marketplace': {
        const { search, brand, license_id, page, per_page } = args;

        if (license_id) {
          const [details, validation] = await Promise.all([
            client.getLicenseDetails(license_id),
            client.validateLicense(license_id).catch((e) => ({ error: e.message })),
          ]);
          return toolResult({ license: details, validation });
        }

        const result = await client.searchLicenses({
          q: search,
          brand,
          page,
          perPage: per_page,
        });
        return toolResult(result);
      }

      case 'issue_license': {
        const result = await client.issueLicense({
          anchorHandshakeId: args.anchor_handshake_id,
          brand: args.brand,
          rightsHolder: args.rights_holder,
          validUntil: args.valid_until,
          buyToOpenPrice: args.buy_to_open_price,
          permittedUses: args.permitted_uses,
          prohibitedUses: args.prohibited_uses,
          maxGrants: args.max_grants,
          royaltyPercentage: args.royalty_percentage,
          royaltyCapUsd: args.royalty_cap_usd,
          platformFeePercentage: args.platform_fee_percentage,
          imageUrl: args.image_url,
        });
        return toolResult(result);
      }

      case 'purchase_license': {
        const { license_id, payment_amount } = args;
        const result = await client.acquireLicense(license_id, payment_amount);
        return toolResult(result);
      }

      case 'verify_grant': {
        const { grant_id } = args;
        const result = await client.verifyGrant(grant_id);
        return toolResult(result);
      }

      // =====================================================================
      // ENTERPRISE
      // =====================================================================
      case 'enterprise_licenses': {
        const { action } = args;

        if (action === 'browse') {
          const result = await client.getEnterpriseLicenses({
            brand: args.brand,
            minSeats: args.min_seats,
            maxPrice: args.max_price,
          });
          return toolResult(result);
        }

        if (action === 'acquire') {
          const result = await client.acquireEnterpriseLicense({
            licenseId: args.license_id,
            seatsNeeded: args.seats_needed,
          });
          return toolResult(result);
        }

        return toolError(new Error(`Unknown enterprise_licenses action: ${action}. Use "browse" or "acquire".`));
      }

      // =====================================================================
      // RULES LAYER
      // =====================================================================
      case 'manage_terms': {
        const { action } = args;

        switch (action) {
          case 'create': {
            const result = await client.createTerms(args.handshake_id, {
              accessType: args.access_type,
              accessConfig: args.access_config,
              permittedPurposes: args.permitted_purposes,
              prohibitedPurposes: args.prohibited_purposes,
            });
            return toolResult(result);
          }
          case 'get':
            return toolResult(await client.getTermsById(args.terms_id));
          case 'update':
            return toolResult(await client.updateTermsById(args.terms_id, args.updates || {}));
          case 'revoke':
            return toolResult(await client.revokeTermsById(args.terms_id, {
              reason: args.reason,
            }));
          case 'record_access':
            return toolResult(await client.recordTermsAccess(args.terms_id, {
              accessorId: args.accessor_id,
              purpose: args.purpose,
            }));
          case 'revisions':
            return toolResult(await client.getTermsRevisions(args.terms_id));
          case 'receipts':
            return toolResult(await client.getTermsReceipts(args.terms_id));
          case 'by_handshake':
            return toolResult(await client.getHandshakeTermsV1(args.handshake_id));
          default:
            return toolError(new Error(`Unknown manage_terms action: ${action}`));
        }
      }

      // =====================================================================
      // REGISTRY
      // =====================================================================
      case 'registry': {
        const { action } = args;

        switch (action) {
          case 'history':
            return toolResult(await client.getEntityHistory(args.entity_type, args.entity_id));
          case 'discover':
            return toolResult(await client.discoverRegistries({
              industry: args.industry,
              shakeType: args.shake_type,
            }));
          case 'lookup':
            return toolResult(await client.lookupRegistry(args.entity_id));
          case 'can_issue':
            return toolResult(await client.canIssue(args.entity_id, args.shake_type));
          case 'will_accept':
            return toolResult(await client.willAccept(args.entity_id, args.shake_type, args.issuer_id));
          case 'interop_check':
            return toolResult(await client.checkInteroperability(args.issuer_id, args.receiver_id, args.shake_type));
          default:
            return toolError(new Error(`Unknown registry action: ${action}`));
        }
      }

      default:
        return toolError(new Error(`Unknown tool: ${name}`));
    }
  } catch (error) {
    return toolError(error);
  }
}

/**
 * Handle resource reads
 */
async function handleResourceRead(uri) {
  if (uri.startsWith('attestation://')) {
    const proofToken = uri.replace('attestation://', '');

    if (proofToken === 'example') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              message: 'Replace "example" with an actual proof token to look up an attestation',
              example_uri: 'attestation://shk_v1.YWJjMTIzZGVmNDU2.a1b2c3d4e5f6',
              format: 'attestation://{proof_token}',
            }, null, 2),
          },
        ],
      };
    }

    try {
      // Uses cached verification from ShukaClient
      const result = await client.verify(proofToken);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  if (uri.startsWith('grant://')) {
    const grantId = uri.replace('grant://', '');

    if (grantId === 'example') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              message: 'Replace "example" with an actual grant ID to verify a marketplace grant',
              example_uri: 'grant://GRANT-abc123',
              format: 'grant://{grant_id}',
            }, null, 2),
          },
        ],
      };
    }

    try {
      // Uses cached verification from ShukaClient
      const result = await client.verifyGrant(grantId);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  throw new Error(`Unknown resource: ${uri}`);
}

/**
 * Create MCP server instance
 *
 * This function creates an MCP server that can be used with any transport.
 * For stdio transport (Claude Desktop), use createStdioServer().
 */
function createMCPServer() {
  return {
    name: 'shuka-mcp',
    version: VERSION,
    capabilities: {
      tools: {},
      resources: {},
    },
    tools: TOOLS,
    resources: RESOURCES,
    handleToolCall,
    handleResourceRead,
    client, // Expose client for cache stats, etc.
  };
}

/**
 * Create and run MCP server with stdio transport
 *
 * This is the main entry point for Claude Desktop integration.
 * Run with: npx @shukashake/agent/mcp
 */
async function createStdioServer() {
  // Dynamic import for MCP SDK (optional dependency)
  let Server, StdioServerTransport;
  try {
    const serverModule = await import('@modelcontextprotocol/sdk/server/index.js');
    const transportModule = await import('@modelcontextprotocol/sdk/server/stdio.js');
    Server = serverModule.Server;
    StdioServerTransport = transportModule.StdioServerTransport;
  } catch (error) {
    console.error('MCP SDK not installed. Run: npm install @modelcontextprotocol/sdk');
    process.exit(1);
  }

  const { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ErrorCode, McpError } = await import('@modelcontextprotocol/sdk/types.js');

  const server = new Server(
    {
      name: 'shuka-mcp',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Handle list tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args);
  });

  // Handle list resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: RESOURCES };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    try {
      return handleResourceRead(uri);
    } catch (error) {
      throw new McpError(ErrorCode.InvalidRequest, error.message);
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (doesn't interfere with MCP on stdout)
  console.error(`Shuka MCP Server v${VERSION} - Universal Trust Guardian for AI Agents`);
  console.error('Everything is a Shuka Shake: shake -> terms -> offering -> grant -> registry proof');
  console.error(`API Base: ${client.apiBase}`);
  console.error('One Ring:    create_idempotent_shake, lookup_shake, verify_shake');
  console.error('Attestation: create_attestation, verify_proof, negotiate_trust');
  console.error('Marketplace: browse_marketplace, issue_license, purchase_license, verify_grant');
  console.error('Enterprise:  enterprise_licenses');
  console.error('Rules layer: manage_terms');
  console.error('Registry:    registry');
  console.error('Resources:   attestation://{proof_token}, grant://{grant_id}');

  return server;
}

// Run as CLI if executed directly
if (require.main === module) {
  createStdioServer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  createMCPServer,
  createStdioServer,
  TOOLS,
  RESOURCES,
  handleToolCall,
  handleResourceRead,
};
