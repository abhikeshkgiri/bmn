const { spawn } = require('child_process');
const path = require('path');

const command = process.argv[2] || 'dev';
const nextBin = require.resolve('next/dist/bin/next');
const registerDnsPath = path.join(__dirname, '..', 'register-dns.js');
const dns = require('dns');

const servers = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'];
dns.setServers(servers);

const env = { ...process.env, NODE_OPTIONS: '' };
const child = spawn(process.execPath, ['--require', registerDnsPath, nextBin, command, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to start Next.js:', error);
  process.exit(1);
});
