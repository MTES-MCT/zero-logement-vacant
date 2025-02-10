import { parse, stringify } from 'jsonlines';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform, Writable } from 'node:stream';
import { run } from '~/scripts/migrate-precisions/index';
import { WritableStream } from 'node:stream/web';
import { PrecisionDBO, Precisions } from '~/repositories/precisionRepository';
import { List } from 'immutable';
import { faker } from '@faker-js/faker/locale/fr';
import { unlink } from 'node:fs/promises';

describe('Migrate precisions', () => {
  const input = path.join(__dirname, 'input.jsonl');
  const output = path.join(__dirname, 'output.jsonl');
  const mapping = [
    {
      from: 'Dispositifs > Dispositifs incitatifs > Conventionnement avec travaux',
      to: {
        category: 'dispositifs-incitatifs',
        label: 'Conventionnement avec travaux'
      }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Conventionnement sans travaux',
      to: {
        category: 'dispositifs-incitatifs',
        label: 'Conventionnement sans travaux'
      }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Aides locales travaux',
      to: { category: 'dispositifs-incitatifs', label: 'Aides locales travaux' }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Aides à la gestion locative',
      to: {
        category: 'dispositifs-incitatifs',
        label: 'Aides à la gestion locative'
      }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Intermédiation Locative (IML)',
      to: {
        category: 'dispositifs-incitatifs',
        label: 'Intermédiation Locative (IML)'
      }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Dispositif fiscal',
      to: { category: 'dispositifs-incitatifs', label: 'Dispositif fiscal' }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Prime locale vacance',
      to: { category: 'dispositifs-incitatifs', label: 'Prime locale vacance' }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Prime vacance France Ruralités',
      to: {
        category: 'dispositifs-incitatifs',
        label: 'Prime vacance France Ruralités'
      }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Ma Prime Renov',
      to: { category: 'dispositifs-incitatifs', label: 'Ma Prime Renov' }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Prime Rénovation Globale',
      to: {
        category: 'dispositifs-incitatifs',
        label: 'Prime Rénovation Globale'
      }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Prime locale rénovation énergétique',
      to: {
        category: 'dispositifs-incitatifs',
        label: 'Prime locale rénovation énergétique'
      }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Accompagnement à la vente',
      to: {
        category: 'dispositifs-incitatifs',
        label: 'Accompagnement à la vente'
      }
    },
    {
      from: 'Dispositifs > Dispositifs incitatifs > Autre',
      to: { category: 'dispositifs-incitatifs', label: 'Autre' }
    },

    {
      from: 'Dispositifs > Dispositifs coercitifs > ORI - TIRORI',
      to: { category: 'dispositifs-coercitifs', label: 'ORI - TIRORI' }
    },
    {
      from: 'Dispositifs > Dispositifs coercitifs > Bien sans maître',
      to: { category: 'dispositifs-coercitifs', label: 'Bien sans maître' }
    },
    {
      from: 'Dispositifs > Dispositifs coercitifs > Abandon manifeste',
      to: { category: 'dispositifs-coercitifs', label: 'Abandon manifeste' }
    },
    {
      from: 'Dispositifs > Dispositifs coercitifs > DIA - préemption',
      to: { category: 'dispositifs-coercitifs', label: 'DIA - préemption' }
    },
    {
      from: 'Dispositifs > Dispositifs coercitifs > Procédure d’habitat indigne',
      to: {
        category: 'dispositifs-coercitifs',
        label: 'Procédure d’habitat indigne'
      }
    },
    {
      from: 'Dispositifs > Dispositifs coercitifs > Permis de louer',
      to: { category: 'dispositifs-coercitifs', label: 'Permis de louer' }
    },
    {
      from: 'Dispositifs > Dispositifs coercitifs > Permis de diviser',
      to: { category: 'dispositifs-coercitifs', label: 'Permis de diviser' }
    },
    {
      from: 'Dispositifs > Dispositifs coercitifs > Autre',
      to: { category: 'dispositifs-coercitifs', label: 'Autre' }
    },

    {
      from: 'Dispositifs > Hors dispositif public > Accompagné par un professionnel (architecte, agent immobilier, etc.)',
      to: {
        category: 'hors-dispositif-public',
        label:
          'Accompagné par un professionnel (architecte, agent immobilier, etc.)'
      }
    },
    {
      from: 'Dispositifs > Hors dispositif public > Propriétaire autonome',
      to: { category: 'hors-dispositif-public', label: 'Propriétaire autonome' }
    },

    {
      from: 'Liés au propriétaire > Blocage involontaire > Mise en location ou vente infructueuse',
      to: {
        category: 'blocage-involontaire',
        label: 'Mise en location ou vente infructueuse'
      }
    },
    {
      from: 'Liés au propriétaire > Blocage involontaire > Succession difficile, indivision en désaccord',
      to: {
        category: 'blocage-involontaire',
        label: 'Succession difficile, indivision en désaccord'
      }
    },
    {
      from: 'Liés au propriétaire > Blocage involontaire > Défaut d’entretien / Nécessité de travaux',
      to: {
        category: 'blocage-involontaire',
        label: 'Défaut d’entretien / Nécessité de travaux'
      }
    },
    {
      from: 'Liés au propriétaire > Blocage involontaire > Problème de financement / Dossier non-éligible',
      to: {
        category: 'blocage-involontaire',
        label: 'Problème de financement / Dossier non-éligible'
      }
    },
    {
      from: 'Liés au propriétaire > Blocage involontaire > Manque de conseils en amont de l’achat',
      to: {
        category: 'blocage-involontaire',
        label: 'Manque de conseils en amont de l’achat'
      }
    },
    {
      from: 'Liés au propriétaire > Blocage involontaire > En incapacité (âge, handicap, précarité ...)',
      to: {
        category: 'blocage-involontaire',
        label: 'En incapacité (âge, handicap, précarité ...)'
      }
    },
    {
      from: 'Liés au propriétaire > Blocage volontaire > Réserve personnelle ou pour une autre personne',
      to: {
        category: 'blocage-volontaire',
        label: 'Réserve personnelle ou pour une autre personne'
      }
    },
    {
      from: 'Liés au propriétaire > Blocage volontaire > Stratégie de gestion',
      to: { category: 'blocage-volontaire', label: 'Stratégie de gestion' }
    },
    {
      from: 'Liés au propriétaire > Blocage volontaire > Mauvaise expérience locative',
      to: {
        category: 'blocage-volontaire',
        label: 'Mauvaise expérience locative'
      }
    },
    {
      from: 'Liés au propriétaire > Blocage volontaire > Montants des travaux perçus comme trop importants',
      to: {
        category: 'blocage-volontaire',
        label: 'Montants des travaux perçus comme trop importants'
      }
    },
    {
      from: 'Liés au propriétaire > Blocage volontaire > Refus catégorique, sans raison',
      to: {
        category: 'blocage-volontaire',
        label: 'Refus catégorique, sans raison'
      }
    },
    {
      from: 'Extérieurs au propriétaire > Immeuble / Environnement > Pas d’accès indépendant',
      to: {
        category: 'immeuble-environnement',
        label: 'Pas d’accès indépendant'
      }
    },
    {
      from: 'Extérieurs au propriétaire > Immeuble / Environnement > Immeuble dégradé',
      to: { category: 'immeuble-environnement', label: 'Immeuble dégradé' }
    },
    {
      from: 'Extérieurs au propriétaire > Immeuble / Environnement > Ruine / Immeuble à démolir',
      to: {
        category: 'immeuble-environnement',
        label: 'Ruine / Immeuble à démolir'
      }
    },
    {
      from: 'Extérieurs au propriétaire > Immeuble / Environnement > Nuisances à proximité',
      to: { category: 'immeuble-environnement', label: 'Nuisances à proximité' }
    },
    {
      from: 'Extérieurs au propriétaire > Immeuble / Environnement > Risques Naturels / Technologiques',
      to: {
        category: 'immeuble-environnement',
        label: 'Risques Naturels / Technologiques'
      }
    },
    {
      from: 'Extérieurs au propriétaire > Tiers en cause > Entreprise(s) en défaut',
      to: { category: 'tiers-en-cause', label: 'Entreprise(s) en défaut' }
    },
    {
      from: 'Extérieurs au propriétaire > Tiers en cause > Copropriété en désaccord',
      to: { category: 'tiers-en-cause', label: 'Copropriété en désaccord' }
    },
    {
      from: 'Extérieurs au propriétaire > Tiers en cause > Expertise judiciaire',
      to: { category: 'tiers-en-cause', label: 'Expertise judiciaire' }
    },
    {
      from: 'Extérieurs au propriétaire > Tiers en cause > Autorisation d’urbanisme refusée / Blocage ABF',
      to: {
        category: 'tiers-en-cause',
        label: 'Autorisation d’urbanisme refusée / Blocage ABF'
      }
    },
    {
      from: 'Extérieurs au propriétaire > Tiers en cause > Interdiction de location',
      to: { category: 'tiers-en-cause', label: 'Interdiction de location' }
    },

    {
      from: 'Mode opératoire > Travaux > À venir',
      to: { category: 'travaux', label: 'À venir' }
    },
    {
      from: 'Mode opératoire > Travaux > En cours',
      to: { category: 'travaux', label: 'En cours' }
    },
    {
      from: 'Mode opératoire > Travaux > Terminés',
      to: { category: 'travaux', label: 'Terminés' }
    },
    {
      from: 'Mode opératoire > Occupation > À venir',
      to: { category: 'occupation', label: 'À venir' }
    },
    {
      from: 'Mode opératoire > Occupation > En cours',
      to: { category: 'occupation', label: 'En cours' }
    },
    {
      from: 'Mode opératoire > Occupation > Nouvelle occupation',
      to: { category: 'occupation', label: 'Nouvelle occupation' }
    },
    {
      from: 'Mode opératoire > Mutation > À venir',
      to: { category: 'mutation', label: 'À venir' }
    },
    {
      from: 'Mode opératoire > Mutation > En cours',
      to: { category: 'mutation', label: 'En cours' }
    },
    {
      from: 'Mode opératoire > Mutation > Effectuée',
      to: { category: 'mutation', label: 'Effectuée' }
    }
  ];

  const housings = Array.from(
    {
      length: faker.number.int({ min: 1_000, max: 10_000 })
    },
    () => {
      const precisions = faker.helpers
        .arrayElements(faker.helpers.arrayElements(mapping, { min: 1, max: 4 }))
        .map((precision) => precision.from);
      return {
        geo_code: faker.location.zipCode(),
        id: faker.string.uuid(),
        precisions: precisions
      };
    }
  ).concat({
    geo_code: faker.location.zipCode(),
    id: faker.string.uuid(),
    precisions: [
      'Étude faisabilité',
      'Demande de pièces',
      'Informations transmises - Encore à convaincre',
      'Informations transmises - rendez-vous à fixer',
      "N'est plus un logement"
    ]
  });

  beforeAll(async () => {
    await ReadableStream.from(housings)
      .pipeThrough(Transform.toWeb(stringify()))
      .pipeTo(Writable.toWeb(fs.createWriteStream(input, 'utf8')));
  });

  afterAll(async () => {
    try {
      await Promise.all([unlink(input), unlink(output)]);
    } catch {
      console.log(`No file ${input} found. Skipping clean up...`);
    }
  });

  it('should map $from to $to', async () => {
    const PRECISIONS = await Precisions()
      .select()
      .then((precisions) => {
        return List(precisions)
          .groupBy((precision) => precision.id)
          .map((precisions) => precisions.first() as PrecisionDBO);
      });

    await run();

    await Readable.toWeb(fs.createReadStream(output, 'utf8'))
      .pipeThrough(Transform.toWeb(parse()))
      .pipeTo(
        new WritableStream({
          write(chunk) {
            const expected = housings
              .find(
                (housing) =>
                  housing.geo_code === chunk.geo_code && housing.id === chunk.id
              )
              ?.precisions?.map((precision) => {
                return mapping.find((record) => record.from === precision);
              })
              ?.map((precision) => precision?.to);

            const actual: ReadonlyArray<PrecisionDBO> = chunk.precisions.map(
              (precision: PrecisionDBO['id']) => PRECISIONS.get(precision)
            );
            expect(actual).toIncludeAllPartialMembers(expected ?? []);
          }
        })
      );
  }, 30_000);
});
