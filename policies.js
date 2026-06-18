// policies.js — standalone mock API server (no external deps, pure Node.js)
// Run with: node policies.js
// Endpoints:
//   GET   /policies          — filter + sort + paginate
//   GET   /policies/summary  — filtered aggregate stats
//   PATCH /policies/bulk-flag — bulk update flaggedForReview

const http = require('http');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
const PORT = 3000;
const API_DELAY_MS = 500;

// ─── db helpers ─────────────────────────────────────────────────────────────

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── core logic ─────────────────────────────────────────────────────────────

function applyFilters(policies, q) {
  return policies.filter((p) => {
    // full-text search: policyNumber, policyholderName, underwriter
    if (q.search) {
      const term = q.search.toLowerCase();
      if (
        !p.policyNumber.toLowerCase().includes(term) &&
        !p.policyholderName.toLowerCase().includes(term) &&
        !p.underwriter.toLowerCase().includes(term)
      ) return false;
    }

    // status — comma-separated e.g. "ACTIVE,PENDING"
    if (q.status) {
      const allowed = q.status.split(',');
      if (!allowed.includes(p.status)) return false;
    }

    // lineOfBusiness — comma-separated e.g. "PROPERTY,A&H"
    if (q.lineOfBusiness) {
      const allowed = q.lineOfBusiness.split(',');
      if (!allowed.includes(p.lineOfBusiness)) return false;
    }

    // region — comma-separated
    if (q.region) {
      const allowed = q.region.split(',');
      if (!allowed.includes(p.region)) return false;
    }

    // underwriter — substring
    if (q.underwriter) {
      if (!p.underwriter.toLowerCase().includes(q.underwriter.toLowerCase())) return false;
    }

    // flagged — "true" | "false"
    if (q.flagged !== undefined && q.flagged !== '') {
      if (p.flaggedForReview !== (q.flagged === 'true')) return false;
    }

    // effectiveDate range
    if (q.effectiveDateFrom && p.effectiveDate < q.effectiveDateFrom) return false;
    if (q.effectiveDateTo   && p.effectiveDate > q.effectiveDateTo)   return false;

    // expiryDate range
    if (q.expiryDateFrom && p.expiryDate < q.expiryDateFrom) return false;
    if (q.expiryDateTo   && p.expiryDate > q.expiryDateTo)   return false;

    return true;
  });
}

function applySorting(policies, sortField, sortOrder) {
  if (!sortField) return policies;
  const desc = sortOrder === 'DESC';
  return [...policies].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return desc ? -cmp : cmp;
  });
}

function computeSummary(policies) {
  const today = new Date().toISOString().split('T')[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const counts = { ACTIVE: 0, PENDING: 0, EXPIRED: 0, CANCELLED: 0 };
  let flaggedForReview = 0;
  let expiringSoonPolicies = 0;
  let totalPremium = 0;
  const lobPremiumMap = {};

  for (const p of policies) {
    counts[p.status] = (counts[p.status] || 0) + 1;
    if (p.flaggedForReview) flaggedForReview++;
    if (p.expiryDate >= today && p.expiryDate <= in30) expiringSoonPolicies++;
    totalPremium += p.premiumAmount;
    lobPremiumMap[p.lineOfBusiness] = (lobPremiumMap[p.lineOfBusiness] || 0) + p.premiumAmount;
  }

  return {
    totalPolicies: policies.length,
    activePolicies: counts.ACTIVE,
    pendingPolicies: counts.PENDING,
    expiredPolicies: counts.EXPIRED,
    cancelledPolicies: counts.CANCELLED,
    flaggedForReview,
    expiringSoonPolicies,
    totalPremium,
    lobPremiumMap,
    currency: 'USD',
  };
}

// ─── request helpers ─────────────────────────────────────────────────────────

function parseQuery(reqUrl) {
  const u = new URL(reqUrl, `http://localhost:${PORT}`);
  const q = {};
  u.searchParams.forEach((v, k) => { q[k] = v; });
  return { pathname: u.pathname, q };
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}

function respond(res, statusCode, body) {
  setTimeout(() => {
    res.writeHead(statusCode);
    res.end(JSON.stringify(body));
  }, API_DELAY_MS);
}

// ─── route handlers ───────────────────────────────────────────────────────────

function handleGetPolicies(res, q) {
  const db = readDb();

  let result = applyFilters(db.policies, q);
  result = applySorting(result, q.sortField, q.sortOrder);

  const page = Math.max(1, parseInt(q.page) || 1);
  const limit = Math.max(1, parseInt(q.limit) || 25);
  const total = result.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIdx = (page - 1) * limit;
  const data = result.slice(startIdx, startIdx + limit);

  respond(res, 200, { data, pagination: { page, limit, total, totalPages } });
}

function handleGetSummary(res, q) {
  const db = readDb();
  const filtered = applyFilters(db.policies, q);
  respond(res, 200, computeSummary(filtered));
}

function handleBulkFlag(res, body) {
  const { policyIds, flagged } = body;

  if (!Array.isArray(policyIds) || typeof flagged !== 'boolean') {
    respond(res, 400, { error: 'policyIds (array) and flagged (boolean) are required' });
    return;
  }

  const db = readDb();
  const idSet = new Set(policyIds);
  let updatedCount = 0;

  db.policies = db.policies.map((p) => {
    if (idSet.has(p.id)) {
      updatedCount++;
      return { ...p, flaggedForReview: flagged };
    }
    return p;
  });

  writeDb(db);
  respond(res, 200, { success: true, updatedCount });
}

// ─── server ──────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const { pathname, q } = parseQuery(req.url);

  if (req.method === 'GET' && pathname === '/policies') {
    handleGetPolicies(res, q);
    return;
  }

  if (req.method === 'GET' && pathname === '/policies/summary') {
    handleGetSummary(res, q);
    return;
  }

  if (req.method === 'PATCH' && pathname === '/policies/bulk-flag') {
    const body = await readBody(req);
    handleBulkFlag(res, body);
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: `No route: ${req.method} ${pathname}` }));
});

server.listen(PORT, () => {
  console.log(`\nMock API running at http://localhost:${PORT}\n`);
  console.log('  GET    /policies          — list + filter + sort + paginate');
  console.log('  GET    /policies/summary  — filtered aggregate stats');
  console.log('  PATCH  /policies/bulk-flag — bulk flag/unflag\n');
  console.log(`  ${API_DELAY_MS}ms simulated delay on all responses\n`);
});
