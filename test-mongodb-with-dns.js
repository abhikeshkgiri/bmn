#!/usr/bin/env node
/**
 * MongoDB connection with custom DNS resolver
 * Uses Google DNS (8.8.8.8) to bypass local DNS issues
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Use Google DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

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

console.log('🔍 MongoDB Connection with Google DNS (8.8.8.8)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const mongoose = require('mongoose');

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    retryWrites: true,
    w: 'majority',
    family: 4  // Force IPv4
  })
  .then(async (connection) => {
    console.log('✅ MongoDB connection successful with Google DNS!');
    console.log('');
    
    // Get database info
    const adminDb = connection.connection.db.admin();
    try {
      const ping = await adminDb.ping();
      console.log(`✅ Database ping successful`);
      console.log(`Database: ${connection.connection.db.databaseName}`);
      console.log('');
      
      // List collections
      const collections = await connection.connection.db.listCollections().toArray();
      console.log(`Collections: ${collections.length}`);
      if (collections.length > 0) {
        collections.forEach(col => {
          console.log(`  - ${col.name}`);
        });
      }
    } catch (error) {
      console.error('Error getting database info:', error.message);
    }
    
    await connection.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });
