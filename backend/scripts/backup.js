#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * Creates a timestamped backup of the SQLite database.
 * Usage: node scripts/backup.js [output_dir]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DEFAULT_DB_PATH = path.join(__dirname, '../prisma/dev.db');
const DEFAULT_BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 30; // Keep last 30 backups

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024 / 1024).toFixed(2) + ' MB';
}

function cleanupOldBackups(backupDir, maxKeep) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db') || f.endsWith('.gz'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    // Delete old backups
    if (files.length > maxKeep) {
      const toDelete = files.slice(maxKeep);
      console.log(`\n🗑️  Removing ${toDelete.length} old backup(s)...`);
      
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        console.log(`   Deleted: ${file.name}`);
      }
    }
  } catch (error) {
    console.warn('Warning: Could not cleanup old backups:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const outputDir = args[0] || DEFAULT_BACKUP_DIR;
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || DEFAULT_DB_PATH;

  console.log('📦 Digital Lending OS - Database Backup\n');
  console.log(`Database: ${dbPath}`);
  console.log(`Output:   ${outputDir}\n`);

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Error: Database file not found:', dbPath);
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('✓ Created backup directory\n');
  }

  const timestamp = getTimestamp();
  const backupFile = path.join(outputDir, `backup-${timestamp}.db`);

  try {
    // Copy database file
    console.log('⏳ Creating backup...');
    
    const startTime = Date.now();
    fs.copyFileSync(dbPath, backupFile);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ Backup created successfully!\n');
    console.log(`   File:     ${backupFile}`);
    console.log(`   Size:     ${getFileSize(backupFile)}`);
    console.log(`   Duration: ${duration}s`);

    // Cleanup old backups
    cleanupOldBackups(outputDir, MAX_BACKUPS);

    // List recent backups
    const backups = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('backup-'))
      .sort()
      .reverse()
      .slice(0, 5);

    if (backups.length > 0) {
      console.log('\n📋 Recent backups:');
      backups.forEach(b => {
        const filePath = path.join(outputDir, b);
        console.log(`   • ${b} (${getFileSize(filePath)})`);
      });
    }

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

main();
