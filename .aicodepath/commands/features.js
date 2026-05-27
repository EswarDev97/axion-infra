/**
 * Feature flag CLI commands
 *
 * Usage:
 *   node .aicodepath/bin/aicodepath.js features list
 *   node .aicodepath/bin/aicodepath.js features enable <name>
 *   node .aicodepath/bin/aicodepath.js features disable <name>
 *   node .aicodepath/bin/aicodepath.js features info <name>
 */

const { getInstance } = require('../lib/feature-flags');

function formatTable(features) {
  const nameWidth = Math.max(...features.map(f => f.name.length), 'FEATURE'.length);
  const descWidth = Math.max(...features.map(f => f.description.length), 'DESCRIPTION'.length);

  const sep = `${'-'.repeat(nameWidth)}-+---------+---------+--------------+-${'-'.repeat(descWidth)}`;
  const header = `${'FEATURE'.padEnd(nameWidth)} | ENABLED | DEFAULT | SOURCE       | DESCRIPTION`;

  const rows = features.map(f => {
    const enabledMark = f.enabled ? '✓' : '✗';
    const defaultStr = f.default ? 'true ' : 'false';
    const sourceStr = f.source.toUpperCase().padEnd(12);
    return `${f.name.padEnd(nameWidth)} | ${enabledMark.padEnd(7)} | ${defaultStr.padEnd(7)} | ${sourceStr} | ${f.description}`;
  });

  return [header, sep, ...rows].join('\n');
}

async function listCommand() {
  const flags = getInstance();
  const features = flags.list();

  console.log('\nAICodePath Feature Flags\n');
  console.log(formatTable(features));
  console.log('\nSources:');
  console.log('  CLI_OVERRIDE - Set via setOverride() (in-memory, not persisted)');
  console.log('  CONFIG       - Set in .aicodepath/config.json features.flags');
  console.log('  ENV          - Set via environment variable (deprecated)');
  console.log('  DEFAULT      - Compile-time default value\n');
}

async function enableCommand(name) {
  if (!name) {
    console.error('Error: feature name is required');
    console.error("Usage: aicodepath features enable <name>");
    process.exit(1);
  }

  const flags = getInstance();

  if (!flags.isKnownFeature(name)) {
    console.error(`Error: Unknown feature '${name}'`);
    console.error("Run 'aicodepath features list' to see available features.");
    process.exit(1);
  }

  try {
    flags.setEnabled(name, true);
    console.log(`✓ Feature '${name}' enabled in config.json`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function disableCommand(name) {
  if (!name) {
    console.error('Error: feature name is required');
    console.error("Usage: aicodepath features disable <name>");
    process.exit(1);
  }

  const flags = getInstance();

  if (!flags.isKnownFeature(name)) {
    console.error(`Error: Unknown feature '${name}'`);
    console.error("Run 'aicodepath features list' to see available features.");
    process.exit(1);
  }

  try {
    flags.setEnabled(name, false);
    console.log(`✓ Feature '${name}' disabled in config.json`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function infoCommand(name) {
  if (!name) {
    console.error('Error: feature name is required');
    console.error("Usage: aicodepath features info <name>");
    process.exit(1);
  }

  const flags = getInstance();

  if (!flags.isKnownFeature(name)) {
    console.error(`Error: Unknown feature '${name}'`);
    console.error("Run 'aicodepath features list' to see available features.");
    process.exit(1);
  }

  const feature = flags.getFeature(name);
  const enabled = flags.isEnabled(name);
  const info = flags.list().find(f => f.name === name);

  console.log(`\nFeature: ${name}`);
  console.log(`Description: ${feature.description}`);
  console.log(`Current State: ${enabled ? 'ENABLED ✓' : 'DISABLED ✗'}`);
  console.log(`Default: ${feature.default}`);
  console.log(`Source: ${info.source.toUpperCase()}`);

  if (feature.envVar) {
    const inverseNote = feature.envInverse ? ' (inverse logic: set to true to DISABLE)' : '';
    console.log(`Env Var: ${feature.envVar}${inverseNote}`);
  }

  console.log('');
}

module.exports = async function featuresCommand(args) {
  const subcommand = args[0];
  const arg1 = args[1];

  switch (subcommand) {
    case 'list':
      await listCommand();
      break;
    case 'enable':
      await enableCommand(arg1);
      break;
    case 'disable':
      await disableCommand(arg1);
      break;
    case 'info':
      await infoCommand(arg1);
      break;
    default:
      console.log('Usage: aicodepath features <command> [args]');
      console.log('');
      console.log('Commands:');
      console.log('  list           List all feature flags with current state');
      console.log('  enable <name>  Enable a feature in config.json');
      console.log('  disable <name> Disable a feature in config.json');
      console.log('  info <name>    Show detailed info about a feature');
      process.exit(subcommand ? 1 : 0);
  }
};
