# @shukashake/agent

**Universal Trust Guardian for AI Agents**

The Shuka Shake is the trust layer for moving protected data in the AI economy. It doesn't own what's inside - it guards the exchange, respects confidentiality, and enforces terms without ever touching the metadata within.

This package is your agent's membership to the yacht club - where trust is negotiated, proof tokens are exchanged, and data flows with respect for rights.

**v2.1.0 — Everything is a Shuka Shake.** This is the canonical One Ring package: one SDK and one MCP server uniting attestation, the rules layer, the shake-anchored license marketplace, enterprise licensing, and the registry ledger. The full flow:

```
shake → terms (rules layer) → license offering → grant → registry proof
```

1. **Shake** — create an idempotent Shuka Shake for any entity (same input, same shake, forever)
2. **Terms** — attach modifiable rules to the immutable handshake
3. **Offering** — issue a license offering anchored to the shake
4. **Grant** — purchase the offering; receive a grant with its own proof token
5. **Registry proof** — verify the grant and its full ledger chain, publicly

---

## ⚠️ Partner Access Required

**This SDK requires a verified partner account and an SDK key.**

Authentication is SDK-key-only: every authenticated operation uses your SDK key (sent as `X-SDK-API-Key`). Most operations route through Shuka's `/api/sdk/v1/*` surface; verification and trust-negotiation use the public `/api/shake/*` and `/api/handshake/*` endpoints (verification is free and needs no key). Agents and developers never handle JWTs or raw platform API keys. Scoped permissions (e.g. `license:read`, `license:write`, `transaction:write`) are attached to the key at issuance.

You can install this package, but it will not function without an authorized SDK key issued by Auron.

**To become a partner:**
- Email [info@auron.co](mailto:info@auron.co)
- Connect with leadership via [shuka.app](https://shuka.app)

Once approved, you'll receive API credentials to activate the SDK.

**Attribution model:** the key's user binding IS the attribution. Every shake
this SDK mints is owned by the partner user your key is assigned to
(`user_id` / `partner_id`) and stamped with the minting key (`api_key_id`).
Per-end-user attribution inside your app is your client reference (the `id`
field on attest calls), which lands in the idempotency namespace and
`handshake_metadata`. Agent identity (`X-Agent-Id` / `X-Agent-Type`) is
recorded as labeled-untrusted `asserted_agent` metadata for audit — it never
sets ownership. If your key is unassigned, creations degrade to anonymous
(`"access": "public"`); claim the key via `POST /api/sdk/v1/partner/keys/claim`.

---

## What is Shuka?

Shuka provides cryptographically verified trust handshakes for AI-to-AI and AI-to-human data transfers. Every exchange is attested, auditable, and verifiable.

**Use cases:**
- Healthcare ROI (Release of Information) management
- Construction contractor/permit verification
- Cross-jurisdiction compliance attestation
- Data portability between enterprise systems
- AI agent verification and trust negotiation

**The Shuka Shake is:**
- **Schema-agnostic** - any data format works
- **Industry-agnostic** - healthcare, construction, finance, legal, government
- **Jurisdiction-agnostic** - works across borders and regulatory frameworks

## Install

```bash
npm install @shukashake/agent
```

## Quick Start

```javascript
const { ShukaSDK } = require('@shukashake/agent');

const shuka = new ShukaSDK({
  apiKey: process.env.SHUKA_API_KEY  // your SDK key
});

// Create an attestation (the Shuka Shake)
const result = await shuka.attest(
  'Patient John Doe consents to release records to Dr. Smith',
  { industry: 'healthcare', jurisdiction: 'US' }
);

// Share the proof token - portable, verifiable, universal
console.log(result.proof_token); // shk_v1.xxx.yyy
```

### Quick Start: The United Flow

```javascript
// 1. SHAKE — idempotent: same entity data always yields the same shake
const shake = await shuka.shake('brand', {
  name: 'ACME Studios',
  registration: 'US-TM-12345'
}, { purpose: 'brand identity attestation', industry: 'universal' });

// 2. TERMS — attach modifiable rules to the immutable handshake
await shuka.createTerms(shake.handshake_id, {
  accessType: 'time_limited',
  permittedPurposes: ['licensing', 'verification']
});

// 3. OFFERING — issue a license offering anchored to the shake
const offering = await shuka.issueLicense({
  anchorHandshakeId: shake.handshake_id,
  brand: 'ACME Studios',
  rightsHolder: 'ACME Holdings LLC',
  validUntil: '2027-12-31T23:59:59Z',
  buyToOpenPrice: 500
});

// 4. GRANT — purchase the offering (buyer side)
const grant = await shuka.purchaseLicense(offering.license.id, 500);

// 5. REGISTRY PROOF — verify the grant and its ledger chain
const proof = await shuka.verifyGrant(grant.grant_id);
```

## Core Concepts

### Proof Tokens

When you create an attestation, Shuka returns a proof token:

```
shk_v1.YWJjMTIzZGVm.a1b2c3d4
```

This token is:
- **Portable** - share it anywhere, verify it anywhere
- **Verifiable** - anyone with API access can verify it
- **Persistent** - the attestation record is immutable

### Trust Scores

Every attestation has a trust score (0.0 - 1.0):
- **0.8+** - Safe to proceed
- **0.6-0.8** - Proceed with caution
- **Below 0.6** - Additional verification recommended

### Handshake Types

Shuka supports multiple handshake types for different use cases:

| Type | Use Case |
|------|----------|
| `attestation` | General attestations (default) |
| `license` | License verification |
| `compliance` | Compliance attestation |
| `compliance_attestation` | Compliance with attestation |
| `release_of_information` | Healthcare ROI |
| `partner_compliance` | Partner compliance verification |

## API Reference

### ShukaSDK

Main SDK class for AI agent integration.

```javascript
const { ShukaSDK } = require('@shukashake/agent');

const shuka = new ShukaSDK({
  apiKey: 'your-api-key',
  agentName: 'my-agent'  // For audit trails
});
```

#### attest(description, options?)

Create a verifiable attestation.

```javascript
const result = await shuka.attest(
  'Contractor ABC Corp is licensed for electrical work in Texas',
  {
    industry: 'construction',
    jurisdiction: 'US-TX',
    metadata: {
      contractor_id: 'ABC-123',
      license_number: 'TX-ELEC-456'
    }
  }
);

// Returns:
// {
//   success: true,
//   proof_token: 'shk_v1.xxx.yyy',
//   handshake_id: 'uuid',
//   trust_score: 0.85
// }
```

#### verify(proofToken)

Verify a proof token.

```javascript
const result = await shuka.verify('shk_v1.xxx.yyy');

// Returns:
// {
//   verified: true,
//   trust_score: 0.85,
//   handshake_id: 'uuid',
//   created_at: '2024-01-01T00:00:00Z'
// }
```

#### negotiate(proofToken, purpose?)

Agent-to-agent trust negotiation. When you receive data with a proof from another agent, ask Shuka to vouch for their attestation.

```javascript
const trust = await shuka.negotiate(
  incomingProofToken,
  'processing patient data for care coordination'
);

if (trust.recommendation === 'safe_to_proceed') {
  // The data exchange is trusted - proceed
} else if (trust.recommendation === 'proceed_with_caution') {
  // Consider additional verification
} else {
  // Do not proceed
}
```

#### acknowledgeReceipt(envelopeId)

Complete the exchange by acknowledging receipt (the S'more model - both ends warm).

```javascript
await shuka.acknowledgeReceipt('ENV-xxx');
```

### Terms and Conditions

The terms layer is how data owners set constraints on how their data can be used, and how recipients understand and accept those constraints.

#### Creating Attestations with Terms

Attach terms when creating attestations to control how data can be accessed:

```javascript
const result = await shuka.attest(
  'Patient John Doe (US, healthcare) consents to release records to Dr. Smith',
  {
    terms: {
      accessType: 'time_limited',           // How data can be accessed
      validityDays: 365,                    // Days the terms remain valid
      requireReceipt: true,                 // Accesses must be receipted
      permittedPurposes: ['care_coordination', 'treatment'],
      prohibitedPurposes: ['marketing', 'research']
    }
  }
);
```

Include industry/jurisdiction context in the attested text itself — the
quick-attest endpoint records the text and terms. For richer constraints
(max uses, downstream rules, pricing), attach full terms afterwards with
`createTerms(handshakeId, terms)` (see Rules Layer below).

#### Access Types

| Type | Description |
|------|-------------|
| `single_use` | One-time access, then terms expire |
| `time_limited` | Access valid for a time period |
| `use_limited` | Access valid for N uses |
| `perpetual` | Unlimited access (rare, high trust) |
| `session_bound` | Access tied to active session |
| `windowed` | Access only during specific time windows |

#### getTerms(handshakeId)

Get the terms attached to a handshake before processing its data:

```javascript
const result = await shuka.getTerms('handshake-uuid');

console.log(result.terms.access_type);         // 'time_limited'
console.log(result.terms.permitted_purposes);  // ['care_coordination', 'treatment']
console.log(result.terms.id);                  // terms_id for the ID-based methods
```

> **Removed in 2.1.1:** `acceptTerms`, `checkAccess`, `revokeAccess`,
> `updateTerms`, `getTermsHistory`, and `getTermsAcceptors` called legacy
> routes that never existed server-side (every call 404'd). They now throw
> `NOT_SUPPORTED` with a pointer to the working equivalent in the Rules
> Layer: `recordTermsAccess`, `revokeTermsById`, `updateTermsById`,
> `getTermsRevisions`, and `getTermsReceipts` — all keyed by the `terms_id`
> returned from `getTerms(handshakeId)` or `createTerms()`.

#### getChainOfTrust(handshakeId)

Get the full provenance chain for an attestation.

```javascript
const chain = await shuka.getChainOfTrust('handshake-uuid');
```

### One Ring Shakes (Idempotent)

The headline method. Same entity data always produces the same shake — safe to retry, safe to call from multiple agents.

```javascript
// Create (or return the existing) shake for an entity
const shake = await shuka.shake('vehicle', {
  registration: 'ABC123',
  emission_standard: 'euro6'
}, {
  purpose: 'ULEZ compliance attestation',
  industry: 'construction',      // healthcare | construction | finance | legal | government | sdk | universal
  handshakeType: 'attestation',  // attestation | verification | transfer | consent
  expiresInDays: 365
});

// Look up an existing shake without creating one
const existing = await shuka.lookupShake('vehicle', { registration: 'ABC123', emission_standard: 'euro6' });

// Verify a shake by ID
const status = await shuka.verifyShake(shake.handshake_id);
```

The deterministic entity ID is derived client-side as `ENTITY-` + SHA-256 of the canonicalized (key-sorted) entity data.

### Marketplace (Shake-Anchored Licenses)

Every license offering is anchored to a Shuka Shake; every purchase produces a grant with its own proof token and registry entry.

```javascript
// Browse offerings
const results = await shuka.searchLicenses({ q: 'ACME', brand: 'ACME Studios', page: 1 });

// Inspect and validate a specific offering
const details = await shuka.getLicense(licenseId);
const validity = await shuka.validateLicense(licenseId);

// Issue an offering FROM a handshake (requires SDK key with license:write + issuer role)
const offering = await shuka.issueLicense({
  anchorHandshakeId: 'handshake-uuid',   // required
  brand: 'ACME Studios',                 // required
  rightsHolder: 'ACME Holdings LLC',     // required
  validUntil: '2027-12-31T23:59:59Z',    // required
  buyToOpenPrice: 500,
  permittedUses: ['merchandising'],
  prohibitedUses: ['resale'],
  maxGrants: 100,
  royaltyPercentage: 5
});

// Purchase → grant (alias: acquireLicense). Idempotent per buyer+license:
// replays and already-owned licenses return 409 with no double charge;
// a stale payment amount returns 400 carrying the current license_price.
// (Escrow is not available.)
const grant = await shuka.purchaseLicense(licenseId, 500);

// Verify a grant + its ledger chain integrity (public)
const proof = await shuka.verifyGrant('GRANT-xxx');

// Your holdings and any entity's ledger history
const portfolio = await shuka.getPortfolio();
const history = await shuka.getHistory('license', licenseId);
```

### Enterprise Licensing

Seat-based licensing for teams:

```javascript
const offers = await shuka.browseEnterpriseLicenses({ brand: 'ACME', minSeats: 50 });
```

> **Acquisition not yet available:** the enterprise seat model is not built
> server-side — `acquireEnterpriseSeats` currently returns
> `501 not_implemented` for every request. Use `purchaseLicense` for
> single-grant acquisitions.

### Rules Layer (Terms by ID)

Modifiable terms on immutable handshakes — the rules travel with the shake, and every change is receipted:

```javascript
// Create terms bound to a handshake
const terms = await shuka.createTerms('handshake-uuid', {
  accessType: 'use_limited',
  accessConfig: { max_uses: 10 },
  permittedPurposes: ['care_coordination'],
  prohibitedPurposes: ['marketing']
});

// Read / amend / revoke
await shuka.getTermsById(terms.terms_id);
await shuka.amendTerms(terms.terms_id, { permitted_purposes: ['care_coordination', 'billing'] });
await shuka.revokeTermsById(terms.terms_id, { reason: 'Consent withdrawn', cascadeDownstream: true });

// Record an access against the terms (creates a receipt)
await shuka.recordAccess(terms.terms_id, { purpose: 'care_coordination' });

// Full audit trail
await shuka.getTermsRevisions(terms.terms_id);
await shuka.getTermsReceipts(terms.terms_id);
await shuka.getHandshakeTerms('handshake-uuid');  // all terms on a handshake
```

### Registry Discovery (SDK Pass-Throughs)

Also available directly on `ShukaSDK`:

```javascript
await shuka.discoverRegistries({ industry: 'healthcare', verifiedOnly: true });
await shuka.lookupRegistry('hospital-abc');
await shuka.canIssue('hospital-abc', 'release_of_information');
await shuka.willAccept('clinic-xyz', 'release_of_information');
await shuka.checkInteroperability('hospital-abc', 'clinic-xyz', 'release_of_information');
```

### ShukaClient

Low-level client with direct API access, caching, and deduplication.

```javascript
const { ShukaClient } = require('@shukashake/agent/client');

const client = new ShukaClient({
  apiKey: 'your-api-key',
  agentId: 'my-agent',
  agentType: 'claude'
});
```

#### Registry Discovery

Find organizations that issue or accept specific shake types:

```javascript
// Discover healthcare organizations
const registries = await client.discoverRegistries({
  industry: 'healthcare',
  shakeType: 'release_of_information',
  verifiedOnly: true
});

// Check if an entity can issue a shake type
const canIssue = await client.canIssue('hospital-abc', 'release_of_information');

// Check if an entity will accept a shake type
const willAccept = await client.willAccept('clinic-xyz', 'release_of_information');
```

#### Interoperability Checking

Check if data can flow between two entities:

```javascript
const interop = await client.checkInteroperability(
  'hospital-abc',      // issuer
  'clinic-xyz',        // receiver
  'release_of_information'
);

if (interop.interoperable) {
  // Clinic XYZ will accept ROI from Hospital ABC
}
```

### AI Platform Integrations

#### Claude Integration

```javascript
const { ClaudeIntegration } = require('@shukashake/agent');

const claude = new ClaudeIntegration({ apiKey: '...' });

// Returns Claude-formatted responses
const result = await claude.attestForClaude('My claim');
const verified = await claude.verifyForClaude('shk_v1.xxx.yyy');
const trust = await claude.negotiateForClaude(proofToken, 'purpose');
```

#### ChatGPT Integration

```javascript
const { ChatGPTIntegration } = require('@shukashake/agent');

const gpt = new ChatGPTIntegration({ apiKey: '...' });

// Returns GPT function-calling formatted responses
const result = await gpt.attestForGPT('My claim');
const verified = await gpt.verifyForGPT('shk_v1.xxx.yyy');
const trust = await gpt.negotiateForGPT(proofToken, 'purpose');
```

### Middleware

Create middleware for your agent pipeline:

```javascript
const { createShukaMiddleware, createAttestationMiddleware } = require('@shukashake/agent');

// Verification middleware for incoming data
const verifyTrust = createShukaMiddleware({ apiKey: '...' });

const trust = await verifyTrust(incomingProofToken, 'processing request');
if (trust.shouldProceed) {
  // Safe to act on the data
}

// Attestation middleware for outbound data
const createProof = createAttestationMiddleware({ apiKey: '...' });

const proof = await createProof('My claim', { industry: 'healthcare' });
// Include proof.proofToken in your response
```

### MCP Server (Claude Desktop)

Run as an MCP server for Claude Desktop integration:

```bash
npx @shukashake/agent/mcp
```

Or configure in Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shuka": {
      "command": "npx",
      "args": ["@shukashake/agent/mcp"],
      "env": {
        "SHUKA_API_KEY": "your-api-key"
      }
    }
  }
}
```

**Available MCP Tools (13, united):**

*One Ring shakes*
- `create_idempotent_shake` - RECOMMENDED: create (or return existing) shake for any entity - same input, same shake
- `lookup_shake` - Find an existing shake by entity data without creating one
- `verify_shake` - Verify a shake by its handshake ID

*Attestation (legacy-compatible)*
- `create_attestation` - Create a verifiable attestation
- `verify_proof` - Verify a proof token
- `negotiate_trust` - Agent-to-agent trust negotiation

*Marketplace*
- `browse_marketplace` - Search shake-anchored license offerings, or inspect one by ID
- `issue_license` - Issue a license offering FROM a handshake (requires `license:write`)
- `purchase_license` - Purchase an offering → grant with proof token
- `verify_grant` - Verify a grant, its anchoring license, and ledger chain integrity

*Enterprise*
- `enterprise_licenses` - Browse or acquire seat-based enterprise licenses

*Rules layer*
- `manage_terms` - Create/get/update/revoke terms, record access, revisions, receipts

*Registry*
- `registry` - Ledger history, registry discovery, can-issue/will-accept, interop checks

**Available MCP Resources:**
- `attestation://{proof_token}` - Look up attestation details
- `grant://{grant_id}` - Public grant verification

## Caching

The client includes built-in LRU caching with TTL:

| Operation | Cache Duration |
|-----------|---------------|
| `verify()` | 5 minutes (success), 30 seconds (failure) |
| `getChainOfTrust()` | 10 minutes |
| `discoverRegistries()` | 15 minutes |
| `checkInteroperability()` | 10 minutes |
| `getTerms()` | 5 minutes |
| `checkAccess()` | 2.5 minutes |
| `verifyShake()` | 5 minutes (success), 30 seconds (failure) |
| `verifyGrant()` | 5 minutes (success), 30 seconds (failure) |

Duplicate in-flight requests are automatically deduplicated.

```javascript
// Check cache stats
const stats = shuka.getCacheStats();
console.log(stats);
// {
//   verify: { size: 5, hits: 10, misses: 2, hitRate: '83.3%' },
//   chain: { size: 2, ... },
//   ...
// }

// Clear cache
shuka.clearCache();

// Invalidate specific token
shuka.invalidate('shk_v1.xxx.yyy');
```

## TypeScript

Full TypeScript support with type declarations:

```typescript
import {
  ShukaSDK,
  HandshakeType,
  TrustRecommendation,
  Industry,
  AccessType,
  TermsStatus,
  type AttestationResult,
  type NegotiationResult,
  type TermsResult,
  type AccessCheckResult
} from '@shukashake/agent';

const shuka = new ShukaSDK({ apiKey: process.env.SHUKA_API_KEY });

// Create attestation with terms
const result: AttestationResult = await shuka.attest('My claim', {
  industry: Industry.HEALTHCARE,
  terms: {
    accessType: AccessType.TIME_LIMITED,
    validUntil: '2026-12-31T23:59:59Z',
    permittedPurposes: ['care_coordination'],
    requiresAcceptance: true
  }
});

// Check terms before processing
const terms: TermsResult = await shuka.getTerms(result.proof_token!);
if (terms.requires_acceptance) {
  await shuka.acceptTerms(result.proof_token!, { purpose: 'care_coordination' });
}

// Verify access is permitted
const access: AccessCheckResult = await shuka.checkAccess(result.proof_token!, {
  purpose: 'care_coordination'
});

if (access.permitted) {
  const trust: NegotiationResult = await shuka.negotiate(result.proof_token!);
  if (trust.recommendation === TrustRecommendation.SAFE_TO_PROCEED) {
    // Proceed with data
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHUKA_API_KEY` | Your Shuka SDK API key |
| `SHUKA_API_URL` | API base URL (default: production) |

## Pricing

Shuka uses pay-per-use pricing with volume discounts for partners.

**Pricing tiers:**
- **Developer (pay-per-use)** - Billed per operation via Stripe
- **Enterprise (subscription)** - Included handshake quotas with overage billing

Pricing details are provided during partner onboarding. Volume discounts up to 30% available for enterprise partners.

Live prices come from the shared backend price book at `GET /api/sdk/v1/pricing` — never hardcode amounts (the response also carries `tier_discounts` and per-product blocks such as `ip_report`). As across the whole Shuka surface (SDK v2 billing semantics): there is no free tier, **registering** a shake is billable, **verifying** existing proofs/tokens/grants is free, and identical billable requests are content-idempotent (replays return the existing record — `was_created: false` on the idempotent shake surface — with no new charge). Agent trust negotiation (`negotiate`) and the portfolio read (`getPortfolio`) are also billable.

**Become a partner:** [info@auron.co](mailto:info@auron.co) or visit [shuka.app](https://shuka.app)

## Links

- **Platform**: [shuka.app](https://shuka.app)
- **Demo**: [shuka.app/demo](https://shuka.app/demo)
- **Python SDK (v2.0.0)**: distributed as a presigned tarball via `GET /api/sdk/v1/download` — no PyPI package. See `shukaSDK/README.md`, `shukaSDK/API_SPECIFICATION.md` (generated from the route registry), and `shukaSDK/MIGRATION.md` in the Auron_Shuka repo.

## Company

Built by **Auron** - the gold standard of trust.

## License

MIT
