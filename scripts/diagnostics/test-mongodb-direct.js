#!/usr/bin/env node
/**
 * Direct MongoDB connectivity test
 * Uses environment variables from .env.local
 * No TypeScript or path aliases
 */

require('../test-db-bootstrap.cjs');

const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found');
  process.exit(1);
}

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

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not configured in .env.local');
  process.exit(1);
}

// Don't print the full URI (it contains credentials)
const match = MONGODB_URI.match(/mongodb\+srv:\/\/[^:]+:(.{4}).*@([^/?]+)/);
const hiddenUri = match
  ? `mongodb+srv://user:****@${match[2]}`
  : 'mongodb+srv://***';

console.log('🔍 MongoDB Direct Connection Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`URI: ${hiddenUri}`);
console.log('');

const mongoose = require('mongoose');

const connectOptions = {
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 10000,
  appName: 'bookmynai-cluster'
};

console.log('Connecting to MongoDB...');

mongoose
  .connect(MONGODB_URI, connectOptions)
  .then(async (connection) => {
    console.log('✅ Connection successful');
    console.log('');

    // Get database info
    const adminDb = connection.connection.db.admin();
    const serverStatus = await adminDb.ping();
    
    console.log('📊 Database Information');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Database: ${connection.connection.db.databaseName}`);
    console.log(`Ping: ${serverStatus.ok === 1 ? '✅ OK' : '❌ FAILED'}`);
    console.log(`Connection state: ${connection.connection.readyState}`);
    console.log('');

    // List collections
    const collections = await connection.connection.db.listCollections().toArray();
    console.log(`Collections: ${collections.length}`);
    if (collections.length > 0) {
      collections.slice(0, 5).forEach(col => {
        console.log(`  - ${col.name}`);
      });
      if (collections.length > 5) {
        console.log(`  ... and ${collections.length - 5} more`);
      }
    }

    console.log('');
    console.log('✅ MongoDB CONNECTED');
    await connection.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connection failed');
    console.error('Error:', error.message);
    
    if (error.message.includes('ETIMEOUT')) {
      console.error('\n⚠️  Diagnosis: Timeout connecting to cluster');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Diagnosis: Connection refused');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n⚠️  Diagnosis: Authentication error - check credentials');
    } else if (error.message.includes('Unauthorized')) {
      console.error('\n⚠️  Diagnosis: Access denied - check user permissions');
    }
    
    process.exit(1);
  });
