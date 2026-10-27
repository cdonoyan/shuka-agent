# Shuka — Partner Integration Brief

**For teams building trust, enforcement, or credential infrastructure for the
agentic economy.** This document gives you the exact wire contracts, the two
integration seams where Shuka composes with adjacent products, and a
self-serve path to explore everything before a single call with us.

---

## What Shuka is, in one paragraph

Shuka is the protocol that lets AI agents into enterprise data without handing
over the keys: access controls and traceability placed at the **data layer** —
the service that already sits in front of a system of record. A data owner
registers an immutable, idempotent attestation (a **shake**) for a record and
attaches **terms** (mutable, versioned rules: permitted purposes, prohibited
purposes, validity windows, use limits). When any agent asks for that data, one
call to Shuka's decision point answers *allowed or denied, for this purpose,
right now* — as a signed verdict. Every event — registration, rule change,
access, refusal, revocation — lands on a public, hash-chained, append-only
ledger that anyone can verify without trusting Shuka. The record itself never
reaches us: we hold fingerprints, rules, and verdicts.

The live demonstration is self-serve: **https://www.shuka.app/demo** runs the
full lifecycle — protect a record, admit agents, revoke consent mid-session and
watch the next request refuse, then verify the chain as an outside auditor.

---

## The two seams where partners plug in

### Seam 1 — Enforcement-layer products
*(policy engines, model allow-listing, inspection proxies, egress filters)*

Shuka's enforcement point is `shuka.guard` — an Express-style middleware (or a
single `accessCheck()` call for any stack) installed in the service that serves
data out. It answers one question: **may this accessor use this data for this
purpose under the owner's current terms?**

Your product and ours compose at the same chokepoint, answering different
questions: yours decides *which callers/models/payloads* are acceptable to the
operator; ours decides *whether the data owner's consent and terms permit this
specific use, right now*. Chained, the result is an egress point where both the
operator's policy and the owner's rights are enforced mechanically:

```js
const { createGuard } = require('@shukashake/agent/guard');
const guard = createGuard({ apiKey: process.env.SHUKA_CROSSING_PASS });

app.get('/records/:id',
  yourPolicyFilter(),     // operator policy: which callers/models pass
  guard.express(),        // owner consent: signed allow/deny per purpose
  (req, res) => {
    // req.shuka = the signed verdict (decision, reason, receipt_id, …)
    res.json(loadRecord(req.params.id));
  });
```

The guard is **fail-closed** by default, and every allowed crossing is
receipted on the ledger — observability your customers' auditors can verify
independently.

### Seam 2 — Credential-custody products
*(secrets managers, agent identity platforms, key brokers)*

Shuka's credential model assumes exactly what your product provides: **the
long-lived key never reaches the agent.** A partner key (held in a vault or
CI) is exchanged for a **crossing-pass** — a real key with a 60-second to
1-hour lifetime and a scope subset — and that is all an agent ever holds:

```
POST /api/sdk/v1/keys/exchange
X-SDK-API-Key: <the vaulted partner key>
{ "expires_in_seconds": 900, "permissions": ["handshake:verify"], "name": "agent run 42" }

→ 201 { "crossing_pass": "sk_…", "expires_at": "…", "permissions": […] }
```

Pass rules, enforced server-side: a pass can never create keys, never exchange
for further passes (no chains), never hold a scope its parent lacks, and never
carry administrative scope. Your product is the natural issuer-side home for
this flow: the vault holds the parent, your runtime vends the pass per task,
and a leaked pass dies on its own within minutes.

---

## Explore it yourself — three self-serve paths

**1. The MCP server** (Claude Desktop or any MCP client):

```json
{
  "mcpServers": {
    "shuka": {
      "command": "npx",
      "args": ["@shukashake/agent/mcp"],
      "env": { "SHUKA_API_KEY": "<evaluation key — see below>" }
    }
  }
}
```

15 tools: idempotent shake creation/lookup/verification, attestation and proof
verification, agent-to-agent trust negotiation, the marketplace surface, terms
management (`manage_terms`), registry discovery — and the drawbridge pair:
`check_access` (the decision point) and `revoke_grant`.

**2. The SDK** — `npm install @shukashake/agent` (this repository is its
public source). `README.md` documents the full united flow; `guard.js` is the
enforcement middleware; `CHANGELOG.md` tells the release story.

**3. No key at all** — verification is free and unauthenticated by design:

| Surface | Call |
|---|---|
| Machine-readable platform discovery | `GET https://auron-shuka.onrender.com/api/sdk/v1/status` |
| Verify any proof token | `GET /api/shake/proof/verify/{token}` |
| Verify any grant + its ledger chain | `GET /api/ledger/grant/{grant_id}/verify` |
| Verify an entity's full hash chain | `GET /api/ledger/entity/{entity_type}/{entity_id}/verify` |
| Registry discovery / interop checks | `GET /api/registry/discover`, `/can-issue`, `/will-accept` |

---

## The wire contracts you'll care about

### The decision point — `POST /api/sdk/v1/access/check`

```json
{ "proof_token": "shk_v1.…", "purpose": "authorized_processing",
  "accessor_id": "agent-123", "record": true }
```
```json
{ "allowed": false, "decision": "deny", "reason": "consent_revoked",
  "terms_id": "…", "handshake_id": "…", "uses_remaining": null,
  "receipt_id": null,
  "verdict": { "decision": "deny", "reason": "consent_revoked",
               "checked_at": "…", "nonce": "…", "signature": "<HMAC-SHA256>" } }
```

Accepts `terms_id`, `handshake_id`, or `proof_token` as the target. Deny
reasons are exact machine-readable codes: `consent_revoked`,
`purpose_prohibited`, `purpose_not_permitted`, `uses_exhausted`,
`terms_expired`, `not_yet_valid`, `terms_revoked`. Allowed crossings are
receipted and ledgered (`ACCESSED`); refused crossings are ledgered too
(`ACCESS_DENIED`). Verdicts are HMAC-SHA256 signed.

### Revocation — the bridge raises in real time

The owner revokes a shake (consent withdrawal) or a grant; the status flips
transactionally with a ledger event (`CONSENT_REVOKED` / `GRANT_REVOKED`), and
subscribed systems receive a **signed webhook push** rather than polling:

```
POST <your webhook_url>
X-Shuka-Event: shake.revoked
X-Shuka-Signature: sha256=<HMAC of the canonical JSON body>
```

The next `access/check` after a revocation denies mechanically — no redeploy,
no key rotation, no cache to hunt down.

### The ledger — observability a third party can audit

Append-only, hash-chained per entity, HMAC-sealed. Event vocabulary includes:
`SHAKE_REGISTERED`, `TERMS_CREATED`, `TERMS_CHANGED`, `TERMS_REVOKED`,
`ACCESSED`, `ACCESS_DENIED`, `CONSENT_REVOKED`, `GRANT_ISSUED`,
`GRANT_REVOKED`, `GRANT_EXPIRED`. The public verify endpoint returns integrity
facts only (event types, sequence, truncated hashes) — never payloads.

### Scopes

Attestation-first vocabulary, attached to keys at issuance:
`handshake:create` · `handshake:verify` · `handshake:validate` ·
`handshake:revoke` · `terms:read` · `terms:write` · `envelope:create` ·
`envelope:verify` · `registry:read` — plus marketplace scopes
(`license:*`) and namespace wildcards (`handshake:*`).

### Economics, in one line

Registering is billable; **verifying is free, always** — the proof token is
the unit of open sharing, and per-crossing receipts are the unit of account.

---

## Continuing discovery → partnership

1. **Evaluation SDK key** (scoped, non-production): email
   **info@auron.co** with subject `Partner evaluation key` — include the
   integration seam you're exploring.
2. **Technical deep-dive** — we'll walk the decision-point and credential
   flows against your product's architecture, both directions.
3. **Joint reference integration** — a working chain of your product and the
   guard (Seam 1) or your vault vending crossing-passes (Seam 2), demoable at
   shuka.app/demo's standard.

**Contact:** info@auron.co · https://www.shuka.app

---

*Shuka is built by Auron. This repository is the public source for the
`@shukashake/agent` npm package and the `io.github.cdonoyan/shuka` MCP
server.*
