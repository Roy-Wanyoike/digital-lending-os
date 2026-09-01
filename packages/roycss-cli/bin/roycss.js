#!/usr/bin/env node

/**
 * ROYCSS CLI Entry Point
 * @description Main executable for the ROYCSS command line interface
 */

import { Command } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { addCommand } from '../src/commands/add.js';
import { searchCommand } from '../src/commands/search.js';
import { exportCommand } from '../src/commands/export.js';
import { doctorCommand } from '../src/commands/doctor.js';

// CLI version
const VERSION = '1.0.0';

// Create program
const program = new Command();

program
  .name('roycss')
  .description('ROYCSS - CSS Effects & Components CLI')
  .version(VERSION);

// Register commands
program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(searchCommand);
program.addCommand(exportCommand);
program.addCommand(doctorCommand);

// Parse arguments
program.parse(process.argv);

export { program };
