/**
 * Doctor Command
 * @module roycss-cli/commands/doctor
 * @description Diagnostics and health checks for ROYCSS projects
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { logger, createSpinner } from '../utils/logger';
import { getConfig } from '../utils/config';

/** Health check result */
interface HealthCheckResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
  fix?: string;
}

/** Doctor options */
interface DoctorOptions {
  fix?: boolean;
  verbose?: boolean;
  json?: boolean;
}

/**
 * Run health checks
 */
async function runHealthChecks(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];
  const cwd = process.cwd();

  // Check 1: Config file exists
  const configExists = fs.existsSync(path.join(cwd, '.roycssrc.json'));
  results.push({
    status: configExists ? 'pass' : 'warn',
    message: 'Configuration file (.roycssrc.json)',
    details: configExists ? 'Found' : 'Not found',
    fix: configExists ? undefined : 'Run "roycss init" to create configuration'
  });

  // Check 2: Styles directory
  const stylesDir = path.join(cwd, 'src/styles/roycss');
  const stylesExist = fs.existsSync(stylesDir);
  results.push({
    status: stylesExist ? 'pass' : 'warn',
    message: 'Styles directory (src/styles/roycss)',
    details: stylesExist ? 'Found' : 'Not found',
    fix: stylesExist ? undefined : 'Run "roycss init" to create directory structure'
  });

  // Check 3: Effects directory
  const effectsDir = path.join(stylesDir, 'effects');
  const effectsExist = fs.existsSync(effectsDir);
  const effectsCount = effectsExist ? (await fs.readdir(effectsDir)).filter(f => f.endsWith('.css')).length : 0;
  results.push({
    status: effectsExist ? 'pass' : 'info',
    message: 'Effects installed',
    details: effectsCount > 0 ? `${effectsCount} effects found` : 'No effects installed',
    fix: effectsCount === 0 ? 'Run "roycss add <effect>" to add effects' : undefined
  });

  // Check 4: Node modules
  const nodeModulesExist = fs.existsSync(path.join(cwd, 'node_modules'));
  results.push({
    status: nodeModulesExist ? 'pass' : 'warn',
    message: 'Node modules installed',
    details: nodeModulesExist ? 'Found' : 'Not found - run "npm install"',
    fix: nodeModulesExist ? undefined : 'Run "npm install"'
  });

  // Check 5: Package.json
  const pkgJsonExists = fs.existsSync(path.join(cwd, 'package.json'));
  results.push({
    status: pkgJsonExists ? 'pass' : 'fail',
    message: 'Package.json exists',
    details: pkgJsonExists ? 'Found' : 'Missing',
    fix: pkgJsonExists ? undefined : 'Initialize project with "npm init"'
  });

  // Check 6: Git repository
  const gitDir = path.join(cwd, '.git');
  const gitExists = fs.existsSync(gitDir);
  results.push({
    status: gitExists ? 'pass' : 'info',
    message: 'Git repository initialized',
    details: gitExists ? 'Found' : 'Not initialized',
    fix: gitExists ? undefined : 'Consider initializing git: "git init"'
  });

  // Check 7: Config validity
  if (configExists) {
    try {
      const config = getConfig();
      const configData = config.load();
      
      // Check required fields
      const hasRequiredFields = configData.version !== undefined;
      results.push({
        status: hasRequiredFields ? 'pass' : 'warn',
        message: 'Configuration valid',
        details: hasRequiredFields ? 'Valid structure' : 'Missing required fields',
        fix: hasRequiredFields ? undefined : 'Reinitialize config: "roycss init --force"'
      });
    } catch {
      results.push({
        status: 'fail',
        message: 'Configuration parseable',
        details: 'Invalid JSON syntax',
        fix: 'Check .roycssrc.json for syntax errors'
      });
    }
  }

  // Check 8: File permissions (can write to directories)
  try {
    const testDir = stylesExist ? stylesDir : cwd;
    await fs.access(testDir, fs.constants.W_OK);
    results.push({
      status: 'pass',
      message: 'File system permissions',
      details: 'Read/write access confirmed'
    });
  } catch {
    results.push({
      status: 'fail',
      message: 'File system permissions',
      details: 'No write access',
      fix: 'Check directory permissions'
    });
  }

  return results;
}

/**
 * Execute doctor command
 */
export async function executeDoctor(options: DoctorOptions): Promise<void> {
  const spinner = createSpinner({
    text: 'Running diagnostics...',
    successText: 'Diagnostics complete!'
  });

  spinner.start();

  try {
    const results = await runHealthChecks();

    spinner.succeed();

    // Calculate summary
    const passes = results.filter(r => r.status === 'pass').length;
    const warns = results.filter(r => r.status === 'warn').length;
    const fails = results.filter(r => r.status === 'fail').length;
    const overallStatus = fails > 0 ? 'FAIL' : warns > 0 ? 'WARN' : 'PASS';

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        status: overallStatus,
        summary: { pass: passes, warn: warns, fail: fails },
        checks: results
      }, null, 2));
      return;
    }

    // Pretty output
    logger.header('ROYCSS Diagnostics');

    // Status badge
    const statusEmoji = fails > 0 ? '❌' : warns > 0 ? '⚠️' : '✅';
    const statusColor = fails > 0 ? 'red' : warns > 0 ? 'yellow' : 'green';
    logger.info(`Overall Status: ${statusEmoji} ${overallStatus}`);
    logger.blank();

    // Individual checks
    for (const result of results) {
      const icon = result.status === 'pass' ? '✓' :
                   result.status === 'warn' ? '⚠' :
                   result.status === 'fail' ? '✗' : 'ℹ';
      
      logger.info(`${icon} ${result.message}`);
      
      if (options.verbose && result.details) {
        logger.info(`   ${result.details}`);
      }
      
      if (result.fix && (result.status !== 'pass' || options.verbose)) {
        logger.info(`   💡 Fix: ${result.fix}`);
      }
    }

    // Summary
    logger.blank();
    logger.info('Summary:');
    logger.info(`   ✅ Passing: ${passes}`);
    logger.info(`   ⚠️  Warnings: ${warns}`);
    logger.info(`   ❌ Failing: ${fails}`);

    // Recommendations
    if (fails > 0 || warns > 0) {
      logger.blank();
      logger.info('Recommendations:');
      if (!configExists) {
        logger.info('   1. Run "roycss init" to set up your project');
      }
      if (fails > 0) {
        logger.info('   2. Address failing checks above');
      }
    }

  } catch (error) {
    spinner.fail(error instanceof Error ? error.message : 'Diagnostics failed');
  }
}

/** Export command for Commander */
export const doctorCommand = new Command('doctor')
  .description('Run diagnostics on your ROYCSS project')
  .option('--fix', 'Automatically fix issues where possible')
  .option('-v, --verbose', 'Show detailed output')
  .option('--json', 'Output as JSON')
  .action(executeDoctor);

export default executeDoctor;
