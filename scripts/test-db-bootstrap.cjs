const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env.local');
let contents;
try {
  contents = fs.readFileSync(envPath, 'utf8');
} catch {
  throw new Error('Refusing database test: could not load .env.local.');
}

const uriDefinitions = contents.split(/\r?\n/).filter((line) => /^\s*MONGODB_URI\s*=/.test(line)).length;
const targetDefinitions = contents.split(/\r?\n/).filter((line) => /^\s*BOOKMYNAI_TEST_DB\s*=/.test(line)).length;
if (uriDefinitions !== 1 || targetDefinitions !== 1) {
  throw new Error('Refusing database test: .env.local must contain exactly one MONGODB_URI and BOOKMYNAI_TEST_DB.');
}

const parsed = dotenv.parse(contents);
process.env.MONGODB_URI = parsed.MONGODB_URI || '';
process.env.BOOKMYNAI_TEST_DB = parsed.BOOKMYNAI_TEST_DB || '';

process.env.TS_NODE_PROJECT = 'tsconfig.scripts.json';
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

const { assertIsolatedTestDatabase } = require('./assert-isolated-test-db.ts');
assertIsolatedTestDatabase();

module.exports = { assertIsolatedTestDatabase };
