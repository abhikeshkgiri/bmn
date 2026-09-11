process.env.TS_NODE_PROJECT = 'tsconfig.scripts.json';
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
require('./scripts/test-phase24.ts');
