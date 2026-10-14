# Changelog

## 2.1.2 (2026-10-14)

Metadata-only release — no code changes. Makes the MCP server publicly
discoverable and verifiable.

### Changed
- `repository` / `bugs` now point to the public source repo
  https://github.com/cdonoyan/shuka-agent (the previous URL was a private
  repository that 404'd for external validators, including the MCP registry).
- `server.json` updated to match (repo URL, no subfolder, version 2.1.2).
- Added `LICENSE` file (MIT — was declared in package.json but not shipped).

## 2.1.1 (2026-10-01)

Repair release — no new features. Every change fixes a call that was broken,
misdocumented, or misaligned against the live backend (verified against
production routes 2026-10-01).

### Fixed
- **`verify()` / `verifyProof()` / MCP `verify_proof`**: compact proof tokens
  (`shk_v1.*`) now resolve via `GET /api/shake/proof/verify/{token}` (the
  real registry verifier). Previously every proof token 404'd against the
  secure-envelope route. Envelope IDs (`ENV-*`) still use the envelope route.
- **`negotiate()` / MCP `negotiate_trust`**: no longer returns
  `do_not_proceed` for every valid proof. The free verify pre-check uses the
  fixed endpoint; the fabricated `trust_score >= 0.8` short-circuit (which
  skipped the real negotiation and invented a response) is removed. The
  backend's `verification_confidence` now feeds the returned `trust_score`.
- **`lookupShake` / MCP `lookup_shake`**: a not-found lookup returns
  `{ found: false }` instead of throwing (backend answers 404 on the normal
  negative path).
- **`revokeTermsById`**: sends `revocation_reason` (was `reason`, which the
  backend rejected with 400 on every call). `cascade_downstream` removed —
  it was never read server-side.
- **`recordTermsAccess`**: sends `access_purpose` (was `purpose`, silently
  dropped — any terms with `permitted_purposes` then 403'd every access).
- **`createAttestation`**: terms are translated to the backend schema
  (`access_type`, `validity_days`, `require_receipt`, `permitted_purposes`,
  `prohibited_purposes`). The `industry`/`jurisdiction`/`metadata`/
  `handshake_type` options were never read by the endpoint and are removed
  from the surface — put that context in the attested text. Now also sends
  `X-SDK-API-Key` (canonical header) alongside `X-API-Key`.
- **`createHandshake`**: the `terms` option was silently discarded by the
  backend; it now emits a deprecation warning directing to
  `createTerms(handshakeId, terms)`.
- **`createTerms`**: sends `allow_downstream`/`require_receipt` (the fields
  the backend reads); drops `geographic_constraints`/`delegate_permissions`
  (never read on create).
- **`verifyForClaude` / `verifyForGPT`**: read the real response shape
  (`valid`, `proof.trust_score`) instead of fields that never existed.
- Verify URLs use the real page form `https://shuka.app/verify?token=...`.

### Removed (never worked — now fail fast)
- `acceptTerms`, `checkAccess`, `revokeAccess`, `updateTerms`,
  `getTermsHistory`, `getTermsAcceptors` called `/api/handshake/{id}/terms/*`
  routes that never existed server-side (every call 404'd since 2.0.x).
  They now throw `NOT_SUPPORTED` naming the working ID-based replacement.
- `getTerms(handshakeId)` is rewired to the real route
  `GET /api/sdk/v1/handshake/{id}/terms` (SDK key with license:read).
- `useEscrow` on `acquireLicense`/`purchase_license`: escrow is not
  available server-side (`escrow_not_available` on every attempt).
- `acquireEnterpriseLicense` / MCP `enterprise_licenses` acquire is marked
  NOT AVAILABLE — the backend returns 501 until the seat model ships.

### Changed
- All version strings aligned at 2.1.1 (User-Agent was stuck at 1.0.0);
  requests now send `X-SDK-Version` / `X-SDK-Platform` for backend telemetry.
- Billing disclosures added where missing: `negotiate` is billable,
  `getPortfolio` is a billable read, terms mutations carry per-op pricing,
  acquisition idempotency (409 replay / 409 already_owned / 400 price
  mismatch) documented.
- `AccessType`, `TermsStatus`, `DelegationLevel` re-exported from the
  package root.
