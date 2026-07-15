import { Command } from '@commander-js/extra-typings';

import { repairs } from './index';
import { apply } from './lib/apply';
import { plan } from './lib/plan';
import { stats } from './lib/stats';

export function repairCommand(): Command {
  const cmd = new Command('repair').description(
    'Bulk housing data repair commands'
  );

  cmd
    .command('list')
    .description('List all registered repairs')
    .action(() => {
      const names = Object.keys(repairs);
      if (names.length === 0) {
        console.log('No repairs registered.');
        return;
      }
      names.forEach((name) => console.log(name));
    });

  cmd
    .command('plan')
    .description(
      'Generate plan.jsonl, skipped.jsonl, errors.jsonl for a repair'
    )
    .argument('<name>', 'repair name (see: zlv repair list)')
    .option('--out <dir>', 'output directory', process.cwd())
    .action(async (name, options) => {
      const repair = repairs[name];
      if (!repair) {
        console.error(
          `Unknown repair: "${name}". Run "zlv repair list" to see available repairs.`
        );
        process.exit(1);
      }
      const summary = await plan(repair, { outDir: options.out });
      console.log(`Total:    ${summary.total}`);
      console.log(`Planned:  ${summary.planned}`);
      console.log(`Skipped:  ${summary.skipped}`);
      console.log(`Errors:   ${summary.errors}`);
      console.log(`Events to delete: ${summary.eventsToDelete}`);
      console.log(`Events to create: ${summary.eventsToCreate}`);
      console.log(`\nFiles written to: ${options.out}`);
      console.log('  plan.jsonl, skipped.jsonl, errors.jsonl');
    });

  cmd
    .command('stats')
    .description('Summarise a plan file without touching the DB')
    .argument('<plan-file>', 'path to plan.jsonl')
    .action(async (planFile) => {
      const summary = await stats(planFile);
      console.log(`Planned:  ${summary.planned}`);
      console.log(`Events to delete: ${summary.eventsToDelete}`);
      console.log(`Events to create: ${summary.eventsToCreate}`);
    });

  cmd
    .command('apply')
    .description(
      'Apply a plan file atomically (single transaction, full rollback on failure)'
    )
    .argument('<name>', 'repair name (see: zlv repair list)')
    .argument('<plan-file>', 'path to plan.jsonl')
    .option(
      '--bypass-triggers',
      'disable fast_housing count triggers and recompute once (for large repairs)'
    )
    .option(
      '--no-bypass-triggers',
      "keep count triggers enabled, overriding the repair's default"
    )
    .action(async (name, planFile, options) => {
      const repair = repairs[name];
      if (!repair) {
        console.error(
          `Unknown repair: "${name}". Run "zlv repair list" to see available repairs.`
        );
        process.exit(1);
      }
      // Precedence: CLI flag > repair.bypassTriggers > false.
      const bypassTriggers =
        options.bypassTriggers ?? repair.bypassTriggers ?? false;
      console.log(`Bypass triggers: ${bypassTriggers}`);
      const summary = await apply(planFile, { bypassTriggers });
      console.log(`Updated:         ${summary.updated}`);
      console.log(`Events deleted:  ${summary.eventsDeleted}`);
      console.log(`Events created:  ${summary.eventsCreated}`);
    });

  return cmd;
}
