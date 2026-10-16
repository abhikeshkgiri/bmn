#!/usr/bin/env node
/**
 * Safe MongoDB connectivity test
 * Does not expose secrets
 */

require('../test-db-bootstrap.cjs');

const fs = require('fs');
const path = require('path');

// Manual .env.local loading
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.log('❌ MongoDB URI not configured');
  process.exit(1);
}

// Extract host without exposing credentials
const match = MONGODB_URI.match(/mongodb\+srv:\/\/[^@]+@([^/?]+)/);
const host = match ? match[1] : 'unknown';

console.log('🔍 MongoDB Connectivity Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`MongoDB Host: ${host}`);
console.log(`Connection Format: MongoDB+SRV`);
console.log('');

// Test connection with timeout
console.log('Testing connection...');
const timeout = setTimeout(() => {
  console.log('❌ Connection timeout (30s exceeded)');
  process.exit(1);
}, 30000);

mongoose
  .connect(MONGODB_URI, {
    retryWrites: true,
    w: 'majority',
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  })
  .then(() => {
    clearTimeout(timeout);
    console.log('✅ Connection successful');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    clearTimeout(timeout);
    console.log('❌ Connection failed');
    console.log('Error code:', error.code || 'unknown');
    console.log('Error message:', error.message);
    
    // Diagnose common issues
    if (error.message.includes('ETIMEOUT')) {
      console.log('\n⚠️  Diagnosis: DNS/Network timeout');
      console.log('   - Cannot reach MongoDB Atlas cluster');
      console.log('   - Check: IP allowlist, firewall, DNS resolution');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n⚠️  Diagnosis: DNS resolution failed');
      console.log('   - Hostname not resolving');
      console.log('   - Check: MongoDB hostname is correct');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n⚠️  Diagnosis: Authentication error');
      console.log('   - Invalid username or password');
      console.log('   - Check: Credentials in MONGODB_URI');
    } else if (error.message.includes('Unauthorized')) {
      console.log('\n⚠️  Diagnosis: Access denied');
      console.log('   - User lacks database access');
      console.log('   - Check: Database user roles and permissions');
    }
    
    process.exit(1);
  });
