process.env.TS_NODE_PROJECT = 'tsconfig.scripts.json';
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
require('./test-phase23.ts');
process.exit(0);
