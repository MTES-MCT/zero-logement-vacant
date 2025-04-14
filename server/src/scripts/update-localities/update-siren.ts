import axios from 'axios';
import EstablishmentRepository from '~/repositories/establishmentRepository';
import cliProgress from 'cli-progress';

const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search';
const RATE_LIMIT_DELAY = 200; // 5 requests per second

async function processEstablishments(dummy = true) {
  const establishments = await EstablishmentRepository.find({
    filters: {
      kind: ['Commune'], 
    }
  });

  console.log(`📄 ${establishments.length} establishments found`);

  const bar = new cliProgress.SingleBar({
    format: 'Progress [{bar}] {percentage}% | {value}/{total} | {name}',
    hideCursor: true
  }, cliProgress.Presets.shades_classic);

  bar.start(establishments.length, 0, { name: '' });

  let count = 0;
  for (const [index, est] of establishments.entries()) {
    bar.update(index + 1, { name: est.name });
    const query = `${API_BASE}?q=${encodeURIComponent(est.name)}&est_collectivite_territoriale=true`;

    try {
      const response = await axios.get(query);
      const firstResult = response.data.results?.[0];

      if (!firstResult?.siren) {
        console.log(`❌ [${index + 1}] No SIREN found for "${est.name}"`);
      } else if (firstResult.siren === est.siren) {
        console.log(`🔁 [${index + 1}] ${est.name} — SIREN already up-to-date (${est.siren})`);
      } else if (firstResult.siren !== est.siren) {
        count++;
        if (dummy) {
          console.log(`📝 [DUMMY #${index + 1}] ${est.name} — SIREN: ${est.siren} ➡️ ${firstResult.siren}`);
        } else {
          await EstablishmentRepository.update({
            ...est,
            siren: firstResult.siren,
          });
          console.log(`✅ [#${index + 1}] ${est.name} — SIREN updated: ${est.siren} ➡️ ${firstResult.siren}`);
        }
      }
    } catch (err: any) {
      console.log(`[${index + 1}] Error for "${est.name}" : ${err.message}`);
    }

    // Pause to respect the 7 req/sec limit
    await sleep(RATE_LIMIT_DELAY);
  }
  console.log(`📊 ${count} establishments updated`);
  console.log('✨ Processing complete.');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ts-node update-siren.ts --dummy
const args = process.argv.slice(2);
const dummy = args.includes('--dummy');

processEstablishments(dummy).catch((err) => {
  console.error('Critical error:', err);
});
