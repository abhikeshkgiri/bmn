#!/usr/bin/env node
/**
 * Extended MongoDB connection diagnostics
 * Tests with longer timeouts and detailed error reporting
 */

const fs = require('fs');
const path = require('path');
const net = require('net');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');
    if (key && value) {
      envVars[key] = value;
    }
  }
});

const MONGODB_URI = envVars.MONGODB_URI;

console.log('🔍 Extended MongoDB Connection Diagnostics');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Test 1: DNS lookup
console.log('Test 1: DNS Resolution');
const dns = require('dns');
const hostname = 'bookmynai-cluster.kr2apva.mongodb.net';

dns.resolve(hostname, 'A', (err, addresses) => {
  if (err) {
    console.log(`❌ DNS lookup failed: ${err.message}`);
  } else {
    console.log(`✅ DNS resolved to: ${addresses.join(', ')}`);
  }

  // Test 2: SRV record
  console.log('');
  console.log('Test 2: SRV Record');
  dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, records) => {
    if (err) {
      console.log(`❌ SRV lookup failed: ${err.message}`);
    } else {
      console.log(`✅ SRV records found: ${records.length}`);
      records.forEach(r => {
        console.log(`   - ${r.name}:${r.port}`);
      });
    }

    // Test 3: Raw TCP connection attempt
    console.log('');
    console.log('Test 3: Raw TCP Connection Attempt');
    const testHost = 'ac-qmyakzt-shard-00-00.kr2apva.mongodb.net';
    const testPort = 27017;
    
    const socket = net.createConnection(testPort, testHost, () => {
      console.log(`✅ TCP connection successful to ${testHost}:${testPort}`);
      socket.destroy();
      testMongoose();
    });

    socket.on('error', (err) => {
      console.log(`❌ TCP connection error: ${err.code || err.message}`);
      socket.destroy();
      testMongoose();
    });

    socket.setTimeout(5000, () => {
      console.log(`❌ TCP connection timeout to ${testHost}:${testPort}`);
      socket.destroy();
      testMongoose();
    });
  });
});

function testMongoose() {
  console.log('');
  console.log('Test 4: Mongoose Connection');
  const mongoose = require('mongoose');
  
  mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      retryWrites: true,
      w: 'majority'
    })
    .then(() => {
      console.log('✅ MongoDB connection successful');
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((error) => {
      console.log(`❌ MongoDB connection failed: ${error.message}`);
      
      if (error.message.includes('ENOTFOUND')) {
        console.log('   Cause: DNS resolution failed');
        console.log('   Action: Check your DNS settings');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('   Cause: Connection refused');
        console.log('   Action: Check MongoDB cluster is running and network allows port 27017');
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timed out')) {
        console.log('   Cause: Connection timeout (likely IP allowlist blocking)');
        console.log('   Action: Check MongoDB Atlas Network Access IP allowlist');
        console.log(`   Your IP: 103.184.171.248`);
        console.log('   Add this IP to the allowlist at:');
        console.log('   https://cloud.mongodb.com/v2/6a82aa6b19e83d8f0ec5c2aa#/security/network/accessList');
      } else if (error.message.includes('authentication')) {
        console.log('   Cause: Authentication failed');
        console.log('   Action: Check MONGODB_URI credentials');
      } else {
        console.log(`   Code: ${error.code}`);
      }
      
      process.exit(1);
    });
}
