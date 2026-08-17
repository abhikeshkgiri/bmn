/**
 * MongoDB DNS Configuration Bootstrap
 * 
 * This module must be imported FIRST in the application to ensure DNS is configured
 * before any MongoDB connection attempts occur.
 * 
 * Only applies in Node.js server environments, not in browser contexts.
 * 
 * Usage in src/lib/db.ts:
 *   import './dns-config';  // Must be the first import
 *   import mongoose from 'mongoose';
 */

// Only configure DNS in Node.js server environments.
// Guard the bootstrap to avoid repeated initialization during hot reloads.
const dnsBootstrapKey = '__BOOKMYNAI_DNS_BOOTSTRAP__';

if (
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  process.versions &&
  process.versions.node &&
  !(globalThis as typeof globalThis & { [key: string]: unknown })[dnsBootstrapKey]
) {
  try {
    const dns = require('dns');

    /**
     * Configure DNS servers for reliable MongoDB SRV record resolution.
     * Some local ISP/network resolvers cannot resolve MongoDB Atlas SRV records.
     * Public resolvers are only used in development for this specific connection need.
     */
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      const dnsServers = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'];
      dns.setServers(dnsServers);
      (globalThis as typeof globalThis & { [key: string]: unknown })[dnsBootstrapKey] = true;

      if (process.env.DEBUG_MONGODB) {
        console.log('[MongoDB DNS] Configured DNS servers:', dns.getServers());
      }
    }
  } catch (error) {
    if (process.env.DEBUG_MONGODB) {
      console.log('[MongoDB DNS] Warning: Could not configure DNS', error);
    }
  }
}

