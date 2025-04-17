import db from '~/infra/database';
import cliProgress from 'cli-progress';
import { Establishments } from '~/repositories/establishmentRepository';
import { Users } from '~/repositories/userRepository';

async function deduplicateEstablishments(dummy = true) {
  console.log('🔍 Searching for duplicates by SIREN...');

  const duplicates = await Establishments()
    .select('siren')
    .groupBy('siren')
    .havingRaw('COUNT(*) > 1');

  console.log(`📄 ${duplicates.length} duplicate siren found`);

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(duplicates.length, 0);

  for (const [index, { siren }] of duplicates.entries()) {
    bar.update(index + 1);

    const establishments = await Establishments()
      .select('id')
      .where({ siren })
      .orderBy('id', 'asc');

    const [keeper, ...toRemove] = establishments.map(e => e.id);

    if (!keeper || toRemove.length === 0) continue;

    if (dummy) {
      console.log(`📝 [DUMMY] "${siren}": keep #${keeper}, remove [${toRemove.join(', ')}]`);
    } else {
      await Users()
        .whereIn('establishment_id', toRemove)
        .update({ establishment_id: keeper });

      await Establishments()
        .whereIn('id', toRemove)
        .del();

      console.log(`✅ "${siren}": kept #${keeper}, removed [${toRemove.join(', ')}]`);
    }

    await sleep(50);
  }

  bar.stop();
  console.log('✨ Duplicate cleanup completed.');
}

// ts-node remove-duplicates-establishments.ts --dummy
const args = process.argv.slice(2);
const dummy = args.includes('--dummy');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

deduplicateEstablishments(dummy).catch(err => {
  console.error('Error during duplicate cleanup:', err);
  process.exit(1);
});
