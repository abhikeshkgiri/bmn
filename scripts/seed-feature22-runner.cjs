const mode = process.argv[2];
if (mode !== 'seed' && mode !== 'cleanup') {
  console.error('Usage: seed-feature22-runner.cjs <seed|cleanup> --confirm-database <development-db-name>');
  process.exit(1);
}

process.env.TS_NODE_PROJECT = 'tsconfig.scripts.json';
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
process.argv = [process.argv[0], require.resolve('./seed-feature22-demo.ts'), ...process.argv.slice(2)];
require('./seed-feature22-demo.ts');
