/**
 * shuka.guard — the enforcement point (PEP) enterprises install in front of
 * THEIR OWN data APIs. (Distillation Phase 7, 2026-10-26.)
 *
 * The drawbridge, mechanically: on every crossing the guard asks Shuka's
 * decision point (POST /api/sdk/v1/access/check) whether this accessor may
 * use this data for this purpose right now — evaluating the stored Terms
 * Layer (status, validity window, remaining uses, purpose binding) and the
 * shake's revocation state. Allowed crossings are receipted and land as
 * ACCESSED events on the hash-chained ledger; denials stop the request cold.
 * The data never leaves the enterprise's stack; only the verdict moves.
 *
 * Usage (Express):
 *
 *   const { createGuard } = require('@shukashake/agent/guard');
 *
 *   const guard = createGuard({ apiKey: process.env.SHUKA_CROSSING_PASS });
 *
 *   // Protect a data route: callers must present a Shuka proof + purpose
 *   app.get('/patients/:id/records',
 *     guard.express(),                      // 403s unless Shuka says allow
 *     (req, res) => {
 *       // req.shuka = the signed verdict (decision, reason, receipt_id...)
 *       res.json(loadRecords(req.params.id));
 *     });
 *
 *   // Or framework-agnostic:
 *   const verdict = await guard.checkAccess({
 *     proofToken: 'shk_v1....', purpose: 'care_coordination' });
 *   if (!verdict.allowed) throw new Error(verdict.reason);
 *
 * Fail-closed by default: if Shuka is unreachable, the bridge stays up
 * (denied). Set onError: 'allow' only if your compliance posture permits it.
 */

'use strict';

const DEFAULT_API_BASE = process.env.SHUKA_API_URL || 'https://auron-shuka.onrender.com/api';

class ShukaGuardError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ShukaGuardError';
    this.code = code;
    this.details = details;
  }
}

function createGuard(options = {}) {
  const apiKey = options.apiKey || process.env.SHUKA_API_KEY;
  if (!apiKey) {
    throw new ShukaGuardError(
      'shuka.guard needs an SDK key or crossing-pass (options.apiKey / SHUKA_API_KEY). ' +
      'Exchange your partner key for a short-lived crossing-pass via POST /api/sdk/v1/keys/exchange.',
      'MISSING_API_KEY');
  }
  const apiBase = (options.apiBase || DEFAULT_API_BASE).replace(/\/$/, '');
  const timeout = options.timeout || 5000;
  const onError = options.onError === 'allow' ? 'allow' : 'deny'; // fail-closed default

  /**
   * Ask the decision point. Returns the full verdict payload:
   * { allowed, decision, reason, verdict: {...signed...}, receipt_id, ... }
   */
  async function checkAccess({ termsId, handshakeId, proofToken, purpose,
                               accessorId, record = true } = {}) {
    const body = { purpose: purpose || 'unspecified', record };
    if (termsId) body.terms_id = termsId;
    else if (handshakeId) body.handshake_id = handshakeId;
    else if (proofToken) body.proof_token = proofToken;
    else throw new ShukaGuardError(
      'checkAccess needs termsId, handshakeId, or proofToken', 'MISSING_TARGET');
    if (accessorId) body.accessor_id = accessorId;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const resp = await fetch(`${apiBase}/sdk/v1/access/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SDK-API-Key': apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return {
          allowed: false,
          decision: 'deny',
          reason: data.error || `http_${resp.status}`,
          ...data,
        };
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Default extraction: proof token from X-Shuka-Proof (or ?shuka_proof),
   * purpose from X-Shuka-Purpose (or ?purpose), accessor from X-Agent-Id.
   */
  function defaultExtract(req) {
    const h = (name) => (req.headers && (req.headers[name] || req.headers[name.toLowerCase()])) || undefined;
    const q = (req.query || {});
    return {
      proofToken: h('X-Shuka-Proof') || q.shuka_proof,
      termsId: h('X-Shuka-Terms-Id') || q.shuka_terms_id,
      handshakeId: h('X-Shuka-Handshake') || q.shuka_handshake,
      purpose: h('X-Shuka-Purpose') || q.purpose,
      accessorId: h('X-Agent-Id'),
    };
  }

  /**
   * Express/Connect middleware. `extract(req)` may override how the proof
   * and purpose are pulled from the request.
   */
  function express(extract) {
    return async function shukaGuardMiddleware(req, res, next) {
      let verdict;
      try {
        const target = (typeof extract === 'function') ? extract(req) : defaultExtract(req);
        if (!target.proofToken && !target.termsId && !target.handshakeId) {
          return res.status(401).json({
            error: 'shuka_proof_required',
            message: 'Present a Shuka proof (X-Shuka-Proof) or terms id to cross.',
          });
        }
        verdict = await checkAccess(target);
      } catch (err) {
        if (onError === 'allow') {
          req.shuka = { allowed: true, decision: 'allow', degraded: true, error: String(err) };
          return next();
        }
        return res.status(503).json({
          error: 'shuka_unreachable',
          message: 'Access decision unavailable — failing closed.',
        });
      }

      if (verdict.allowed) {
        req.shuka = verdict;  // signed verdict + receipt_id for the handler
        return next();
      }
      return res.status(403).json({
        error: 'shuka_access_denied',
        reason: verdict.reason,
        decision: verdict.decision,
        verdict: verdict.verdict,
      });
    };
  }

  return { checkAccess, express, defaultExtract };
}

module.exports = { createGuard, ShukaGuardError };
