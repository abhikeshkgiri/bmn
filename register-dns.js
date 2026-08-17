const dns = require('dns');

try {
  const servers = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'];
  dns.setServers(servers);

  if (process.env.DEBUG_MONGODB) {
    console.log('[MongoDB DNS preload] Configured servers:', dns.getServers());
  }
} catch (error) {
  if (process.env.DEBUG_MONGODB) {
    console.error('[MongoDB DNS preload] Failed to configure DNS:', error.message);
  }
}
