#!/usr/bin/env node

// ─── Environment Variable Validator ──────────────────────────────────────
// Loads .env.example, identifies required vs optional variables,
// and checks which are actually set in the current environment.
// Exits with code 1 if any critical variable is missing.
// ──────────────────────────────────────────────────────────────────────────

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');

// ── Variables that MUST be set in production ─────────────────────────────
const CRITICAL_VARS = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];

// ── Parse .env.example ───────────────────────────────────────────────────
function parseEnvExample(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip blanks, comments, and section headers
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Extract variable name (everything before the first =)
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;

    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();

    // Determine if this variable is commented out (optional) or not (required)
    const isCommented = line.startsWith('#') && !line.startsWith('# ');
    // More precise: look at the original line before trimming
    const originalLine = line;
    const required = !originalLine.trimStart().startsWith('#');

    vars.push({ name, required, hasDefaultValue: value !== '' });
  }

  return vars;
}

// ── Main ─────────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(ENV_EXAMPLE)) {
    console.error('ERROR: .env.example not found at', ENV_EXAMPLE);
    process.exit(1);
  }

  const envVars = parseEnvExample(ENV_EXAMPLE);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  YOUNGSEND Environment Variable Validation');
  console.log('═══════════════════════════════════════════════════════\n');

  const missingRequired = [];
  const missingOptional = [];
  const present = [];

  for (const v of envVars) {
    const val = process.env[v.name];
    if (val && val.length > 0) {
      present.push(v.name);
    } else if (v.required) {
      missingRequired.push(v.name);
    } else {
      missingOptional.push(v.name);
    }
  }

  // ── Report present variables ────────────────────────────────────
  console.log(`✅  Set (${present.length}/${envVars.length}):`);
  for (const name of present) {
    const isCritical = CRITICAL_VARS.includes(name);
    console.log(`   ${isCritical ? '🔒' : '  '} ${name}`);
  }

  // ── Report missing optional variables ───────────────────────────
  if (missingOptional.length > 0) {
    console.log(`\n⚠️  Not set (optional, ${missingOptional.length}):`);
    for (const name of missingOptional) {
      console.log(`   - ${name}`);
    }
  }

  // ── Report missing required variables ───────────────────────────
  if (missingRequired.length > 0) {
    console.log(`\n❌  Missing required (${missingRequired.length}):`);
    for (const name of missingRequired) {
      const isCritical = CRITICAL_VARS.includes(name);
      console.log(`   ${isCritical ? '🔴 CRITICAL' : '🟡 REQUIRED'}: ${name}`);
    }
  }

  // ── Critical variable check ─────────────────────────────────────
  const missingCritical = CRITICAL_VARS.filter((v) => !process.env[v]);
  if (missingCritical.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.error('CRITICAL: The following variables must be set:');
    for (const name of missingCritical) {
      console.error(`  - ${name}`);
    }
    console.error('\nSet them in your .env file or environment before deploying.');
    console.error('  cp .env.example .env  # then edit .env');
    console.log('═══════════════════════════════════════════════════════');
    process.exit(1);
  }

  console.log('\n✅ All critical environment variables are set.');
  process.exit(0);
}

main();
