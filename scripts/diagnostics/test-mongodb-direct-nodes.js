#!/usr/bin/env node
/**
 * MongoDB direct connection test (bypassing SRV)
 * Tests if the cluster nodes are reachable without DNS SRV lookup
 */

const { assertIsolatedTestDatabase } = require('../test-db-bootstrap.cjs');

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found');
  process.exit(1);
}

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
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

// Parse credentials and cluster info from URI
const match = MONGODB_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)\/([^?]+)/);
if (!match) {
  console.error('❌ Invalid MONGODB_URI format');
  process.exit(1);
}

const [, username, password, cluster, database] = match;

console.log('🔍 MongoDB Direct Connection Test (No SRV)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Database: ${database}`);
console.log(`Cluster: ${cluster}`);
console.log('');

const mongoose = require('mongoose');

// Use direct connection strings to the known shards
const directUris = [
  `mongodb://${username}:${password}@ac-qmyakzt-shard-00-00.kr2apva.mongodb.net:27017/${database}?ssl=true&replicaSet=atlas-13gvbt-shard-0&authSource=admin&retryWrites=true&w=majority`,
  `mongodb://${username}:${password}@ac-qmyakzt-shard-00-01.kr2apva.mongodb.net:27017/${database}?ssl=true&replicaSet=atlas-13gvbt-shard-0&authSource=admin&retryWrites=true&w=majority`,
  `mongodb://${username}:${password}@ac-qmyakzt-shard-00-02.kr2apva.mongodb.net:27017/${database}?ssl=true&replicaSet=atlas-13gvbt-shard-0&authSource=admin&retryWrites=true&w=majority`,
];

let success = false;

async function testDirectConnection() {
  for (let i = 0; i < directUris.length; i++) {
    const uri = directUris[i];
    const shard = `shard-00-0${i}`;
    process.stdout.write(`Testing ${shard}... `);
    
    try {
      assertIsolatedTestDatabase({ ...process.env, MONGODB_URI: uri });
      const connection = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 5000
      });
      
      await connection.connection.db.admin().ping();
      console.log('✅ OK');
      success = true;
      await connection.disconnect();
      
      console.log('');
      console.log('✅ Direct connection successful');
      console.log(`Connected to shard: ${shard}`);
      break;
    } catch (error) {
      console.log(`❌ ${error.message.split('\n')[0]}`);
    }
  }

  if (!success) {
    console.log('');
    console.log('❌ All direct connections failed');
    process.exit(1);
  }

  process.exit(0);
}

testDirectConnection();
