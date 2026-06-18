// Generates db.json with 210 mock APAC insurance policies for json-server
const fs = require('fs');
const path = require('path');

const regions = ['Singapore', 'Hong Kong', 'Australia', 'Japan', 'Thailand', 'Indonesia', 'Malaysia', 'Philippines'];

const currencyMap = {
  'Singapore': 'SGD',
  'Hong Kong': 'HKD',
  'Australia': 'AUD',
  'Japan': 'JPY',
  'Thailand': 'THB',
  'Indonesia': 'USD',
  'Malaysia': 'SGD',
  'Philippines': 'USD',
};

const linesOfBusiness = ['PROPERTY', 'CASUALTY', 'A&H', 'MARINE'];

// Weighted statuses: ~50% ACTIVE, ~20% PENDING, ~20% EXPIRED, ~10% CANCELLED
const statusPool = [
  'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',
  'PENDING', 'PENDING',
  'EXPIRED', 'EXPIRED',
  'CANCELLED',
];

const underwriters = ['Zurich', 'Allianz', 'AIA', 'AXA', 'Chubb', 'Tokio Marine'];

const firstNames = [
  'Wei', 'Hiroshi', 'Siti', 'Budi', 'Mariana', 'Li', 'Yuki', 'Maria', 'Amit', 'Sophia',
  'Ravi', 'Juan', 'Priya', 'David', 'Fatima', 'Kenji', 'Leila', 'Marco', 'Anita', 'Timothy',
  'Sakura', 'Hassan', 'Jennifer', 'Rajesh', 'Lucia', 'Mei', 'Taro', 'Noor', 'Aditya', 'Grace',
  'Haruto', 'Nurul', 'Surya', 'Ling', 'Ahmad', 'Van', 'Sunita', 'Takeshi', 'Putri', 'Kevin',
  'Ying', 'Masaki', 'Dewi', 'Arjun', 'Michelle', 'Ryota', 'Farah', 'Sanjay', 'Wan', 'Derek',
  'Jing', 'Satoshi', 'Indira', 'Paolo', 'Nadia', 'Sota', 'Aziz', 'Vivek', 'Hui', 'Patrick',
];

const lastNames = [
  'Tan', 'Tanaka', 'Bin Ali', 'Santoso', 'Santos', 'Wong', 'Yamamoto', 'Garcia', 'Patel', 'Chen',
  'Kumar', 'Reyes', 'Sharma', 'Lee', 'Hassan', 'Suzuki', 'Ahmed', 'Villeneuve', 'Singh', 'Park',
  'Nakamura', 'Rodriguez', 'Nair', 'Kim', 'Watanabe', 'Lim', 'Sato', 'Wijaya', 'Iyer', 'Ng',
  'Kobayashi', 'Yusof', 'Hernandez', 'Zhang', 'Rahman', 'Tran', 'Gupta', 'Ito', 'Handayani', 'Ho',
  'Xu', 'Matsumoto', 'Prasetyo', 'Krishnan', 'De Leon', 'Hayashi', 'Osman', 'Mehta', 'Fong', 'Chan',
  'Liu', 'Yamada', 'Putri', 'Cruz', 'Popescu', 'Ogawa', 'Ismail', 'Agarwal', 'Lin', 'Andersen',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const now = new Date();
const policies = [];

for (let i = 1; i <= 210; i++) {
  const region = pick(regions);
  const currency = currencyMap[region];
  const lob = pick(linesOfBusiness);
  const status = pick(statusPool);
  const underwriter = pick(underwriters);
  const name = `${pick(firstNames)} ${pick(lastNames)}`;

  // effectiveDate between 6 and 36 months ago
  const monthsBack = randInt(6, 36);
  const effectiveDate = new Date(now);
  effectiveDate.setMonth(effectiveDate.getMonth() - monthsBack);

  // expiryDate always 12 months after effectiveDate
  const expiryDate = new Date(effectiveDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  // premium: 80% chance 1k–500k, 20% chance 500k–5M
  const premium = Math.random() < 0.8
    ? randInt(1000, 500000)
    : randInt(500001, 5000000);

  // ~20% flagged
  const flaggedForReview = Math.random() < 0.2;

  policies.push({
    id: `policy-${i}`,
    policyNumber: `POL-${String(i).padStart(6, '0')}`,
    policyholderName: name,
    lineOfBusiness: lob,
    status,
    premiumAmount: premium,
    currency,
    effectiveDate: fmtDate(effectiveDate),
    expiryDate: fmtDate(expiryDate),
    region,
    underwriter,
    flaggedForReview,
  });
}

const db = { policies };
const outPath = path.join(__dirname, '..', 'db.json');
fs.writeFileSync(outPath, JSON.stringify(db, null, 2));

const flaggedCount = policies.filter(p => p.flaggedForReview).length;
const statusCounts = policies.reduce((acc, p) => {
  acc[p.status] = (acc[p.status] || 0) + 1;
  return acc;
}, {});

console.log(`Generated ${policies.length} policies → db.json`);
console.log(`Flagged: ${flaggedCount} (${((flaggedCount / policies.length) * 100).toFixed(1)}%)`);
console.log('Status distribution:', statusCounts);
