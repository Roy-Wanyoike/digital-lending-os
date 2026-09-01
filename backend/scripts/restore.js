#!/usr/bin/env node

/**
 * Database Restore Script
 * 
 * Restores database from a backup file.
 * Usage: node scripts/restore.js <backup_file> [--force]
 * 
 * WARNING: This will overwrite the current database!
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_DB_PATH = path.join(__dirname, '../prisma/dev.db');
const DEFAULT_BACKUP_DIR = path.join(__dirname, '../backups');

function confirmAction(message) {
  // In non-interactive mode (CI/CD), check --force flag
  if (process.argv.includes('--force')) {
    return true;
  }

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

function listBackups(backupDir) {
  try {
    return fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && (f.endsWith('.db') || f.endsWith('.gz')))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (stats.size / 1024 / 1024).toFixed(2) + ' MB';
  } catch {
    return 'Unknown';
  }
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const backupFile = args[0];
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || DEFAULT_DB_PATH;

  console.log('🔄 Digital Lending OS - Database Restore\n');

  // If no backup file specified, list available backups
  if (!backupFile) {
    console.log('Usage: node scripts/restore.js <backup_file> [--force]\n');
    
    const backups = listBackups(DEFAULT_BACKUP_DIR);
    
    if (backups.length === 0) {
      console.log('No backups found in:', DEFAULT_BACKUP_DIR);
      process.exit(1);
    }

    console.log('Available backups:\n');
    backups.forEach((b, i) => {
      const filePath = path.join(DEFAULT_BACKUP_DIR, b);
      console.log(`   ${i + 1}. ${b} (${getFileSize(filePath)})`);
    });

    console.log('\nTo restore, run:');
    console.log(`   node scripts/restore.js ${backups[0]} --force`);
    process.exit(0);
  }

  // Resolve backup file path
  let resolvedBackupPath = backupFile;
  if (!fs.existsSync(backupFile)) {
    resolvedBackupPath = path.join(DEFAULT_BACKUP_DIR, backupFile);
    if (!fs.existsSync(resolvedBackupPath)) {
      console.error('❌ Error: Backup file not found:', backupFile);
      process.exit(1);
    }
  }

  // Check backup exists
  if (!fs.existsSync(resolvedBackupPath)) {
    console.error('❌ Error: Backup file not found:', resolvedBackupPath);
    process.exit(1);
  }

  console.log(`Backup:   ${resolvedBackupPath}`);
  console.log(`Database: ${dbPath}`);
  console.log(`Size:     ${getFileSize(resolvedBackupPath)}\n`);

  // Check current database
  const dbExists = fs.existsSync(dbPath);
  if (dbExists) {
    console.log(`⚠️  Current database will be overwritten!`);
    console.log(`   Current size: ${getFileSize(dbPath)}\n`);
  }

  // Confirm restore
  const confirmed = await confirmAction(
    'Are you sure you want to restore this backup? This action cannot be undone.'
  );

  if (!confirmed) {
    console.log('\n❌ Restore cancelled.');
    process.exit(0);
  }

  try {
    // Create backup of current database before restoring
    if (dbExists) {
      console.log('📦 Creating safety backup of current database...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyBackup = path.join(DEFAULT_BACKUP_DIR, `pre-restore-${timestamp}.db`);
      
      fs.copyFileSync(dbPath, safetyBackup);
      console.log(`   Saved to: ${safetyBackup}\n`);
    }

    // Perform restore
    console.log('⏳ Restoring database...');
    const startTime = Date.now();

    fs.copyFileSync(resolvedBackupPath, dbPath);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ Database restored successfully!\n');
    console.log(`   Source:  ${resolvedBackupPath}`);
    console.log(`   Target:  ${dbPath}`);
    console.log(`   Size:    ${getFileSize(dbPath)}`);
    console.log(`   Time:    ${duration}s`);

    console.log('\n💡 Tip: Run "npx prisma migrate deploy" if schema changes are needed.');

  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    process.exit(1);
  }
}

main();
