import async from 'async';
import { formatDuration, intervalToDuration, isValid } from 'date-fns';
import { Knex } from 'knex';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

const logger = console;
const BATCH_SIZE = 100_000;

export async function up(knex: Knex): Promise<void> {
  const email = 'admin@zerologementvacant.beta.gouv.fr';
  const admin = await knex('users').where({ email }).first();

  if (!admin) {
    throw new Error(`${email} not found`);
  }

  const start = new Date();

  let length = 0;
  let count = 0;
  let currentId: string | undefined;

  const result = await knex('housing').count().first();
  const total = Number(result?.count);

  logger.info(`${total} housing found.`);

  await async.doUntil(
    async () => {
      const housingList: Housing[] = await knex('housing')
        .modify((builder) => {
          if (currentId) {
            builder.where('id', '>', currentId);
          }
        })
        .orderBy('id')
        .limit(BATCH_SIZE);
      // Remember the last id for pagination
      currentId = fp.last(housingList)?.id;

      const items = housingList
        .map((oldHousing) => {
          const mapHousing = fp.compose(
            mapVacancyReasons,
            mapPrecisions,
            mapSubStatus
          );
          const newHousing = mapHousing(oldHousing);
          const event = {
            id: uuidv4(),
            housing_id: oldHousing.id,
            name: 'Modification arborescence de suivi',
            kind: 'Update',
            category: 'Followup',
            section: 'Situation',
            conflict: false,
            old: denormalizeOldStatus(oldHousing),
            new: denormalizeNewStatus(newHousing),
            created_at: new Date(),
            created_by: admin.id
          };

          // Speed up the process by removing untouched housing
          return equals(oldHousing, newHousing) && !statusChanges(oldHousing)
            ? null
            : {
                event,
                housing: newHousing
              };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const events: HousingEvent[] = items
        .map((item) => item.event)
        .flatMap((event) =>
          event.old.sub_status === 'Absent du millésime suivant'
            ? [
                event,
                {
                  id: uuidv4(),
                  housing_id: event.old.id,
                  name: 'Absent du millésime 2023',
                  kind: 'Delete',
                  category: 'Followup',
                  section: 'Situation',
                  conflict: false,
                  created_at: new Date(),
                  created_by: event.created_by
                }
              ]
            : event
        );
      await async.forEach(fp.chunk(1000, events), async (events) => {
        await saveEvents(knex)(events);
      });
      const compactHousingList = items.map((item) => item.housing);
      await async.forEach(fp.chunk(1000, compactHousingList), async (hl) => {
        await saveHousingList(knex)(hl);
      });

      length = housingList.length;
      count += length;
      logger.info(`${count} / ${total} housing`);
    },
    async () => length < BATCH_SIZE
  );

  const end = new Date();
  logger.info(`Done in ${formatDuration(intervalToDuration({ start, end }))}`);
}

export async function down(knex: Knex): Promise<void> {
  const email = 'admin@zerologementvacant.beta.gouv.fr';
  const admin = await knex('users').where({ email }).first();

  let length = 0;
  let currentId: string | undefined;

  // knex stream does not work in a migration...
  await async.doUntil(
    async () => {
      const events: HousingEvent[] = await knex('events')
        .where({
          name: 'Modification arborescence de suivi'
        })
        .modify((builder) => {
          if (currentId) {
            builder.where('id', '>', currentId);
          }
        })
        .orderBy('id')
        .limit(BATCH_SIZE);
      // Remember the last id for pagination
      currentId = fp.last(events)?.id;

      const housingList: Housing[] = events
        .map((event) => event.old)
        .filter(
          (housing): housing is NonNullable<HousingSerialized> =>
            !fp.isNil(housing)
        )
        .map((h) => ({
          ...h,
          mutation_date: isValid(h.mutation_date) ? h.mutation_date : null
        }))
        .map(normalizeStatus);

      await async.forEach(fp.chunk(1000, housingList), async (_) => {
        logger.debug('Saving housing list...');
        await saveHousingList(knex)(_);
        logger.debug('Save housing list');
      });

      length = events.length;
    },
    async () => length < BATCH_SIZE
  );

  if (admin) {
    await knex('events').where({ created_by: admin.id }).delete();
  }

  function normalizeStatus(housing: HousingSerialized): Housing {
    const statuses = [
      'Jamais contacté',
      'En attente de retour',
      'Premier contact',
      'Suivi en cours',
      'Non-vacant',
      'Bloqué',
      'Sortie de la vacance'
    ];

    const status = statuses.indexOf(housing.status);
    if (status === -1) {
      throw new Error(`Status ${housing.status} not found`);
    }
    return { ...housing, status };
  }
}

function statusChanges(housing: Housing): boolean {
  const changingStatuses = [
    HousingStatus.NeverContacted,
    HousingStatus.Exit,
    HousingStatus.NotVacant
  ];
  return changingStatuses.includes(housing.status);
}

function equals(a: Housing, b: Housing): boolean {
  const subset = fp.pick([
    'status',
    'sub_status',
    'precisions',
    'vacancy_reasons',
    'occupancy'
  ]);
  return fp.isEqual(subset(a), subset(b));
}

function mapSubStatus(housing: Housing): Housing {
  if (!housing.sub_status) {
    return housing;
  }

  const map: Record<string, Partial<Housing>> = {
    'Intérêt potentiel': {
      sub_status: 'Intérêt potentiel / En réflexion'
    },
    'Via accompagnement': {
      sub_status: 'Sortie de la vacance'
    },
    'Intervention publique': {
      sub_status: 'Sortie de la vacance'
    },
    'Sans accompagnement': {
      sub_status: 'Sortie de la vacance'
    },
    'Absent du millésime suivant': {
      sub_status: 'Sortie de la vacance'
    },
    'Déclaré non-vacant': {
      sub_status: 'N’était pas vacant'
    },
    'Constaté non-vacant': {
      sub_status: 'N’était pas vacant'
    },
    NPAI: {
      status: HousingStatus.FirstContact,
      sub_status: 'N’habite pas à l’adresse indiquée'
    },
    'Vacance volontaire': {
      sub_status: 'Blocage volontaire du propriétaire'
    },
    'Mauvais état': {
      sub_status: 'Immeuble / Environnement'
    },
    'Mauvaise expérience locative': {
      sub_status: 'Blocage volontaire du propriétaire'
    },
    'Blocage juridique': {
      sub_status: 'Blocage involontaire du propriétaire'
    },
    'Liée au propriétaire': {
      sub_status: 'Blocage involontaire du propriétaire'
    },
    'Projet qui n’aboutit pas': {
      sub_status: 'Blocage involontaire du propriétaire'
    },
    'Rejet formel de l’accompagnement': {
      sub_status: 'Blocage volontaire du propriétaire'
    }
  };

  const changes = map[housing.sub_status] ?? {};
  return { ...housing, ...changes };
}

function mapPrecisions(housing: Housing): Housing {
  if (!housing.precisions) {
    return housing;
  }

  const removable = new Set([
    'Informations transmises',
    'Encore à convaincre',
    'Rendez-vous à fixer',
    'Mauvais moment',
    'Recherche autre interlocuteur',
    'Besoin de précisions',
    'Cause inconnue',
    'N’est pas une résidence principale',
    'Autre que logement',
    `N’est plus un logement`
  ]);

  const map: Record<string, Partial<Housing>> = {
    'Logement récemment vendu': {
      precisions: ['Mode opératoire > Mutation > Effectuée'],
      occupancy: 'A'
    },
    'Aides aux travaux': {
      precisions: [
        'Dispositifs > Dispositifs incitatifs > Conventionnement avec travaux'
      ]
    },
    'Aides à la gestion locative': {
      precisions: [
        'Dispositifs > Dispositifs incitatifs > Aides à la gestion locative'
      ]
    },
    'Intermédiation Locative (IML)': {
      precisions: [
        'Dispositifs > Dispositifs incitatifs > Intermédiation Locative (IML)'
      ]
    },
    'Sécurisation loyer': {
      precisions: ['Dispositifs > Dispositifs incitatifs > Sécurisation loyer']
    },
    'Conventionnement sans travaux': {
      precisions: [
        'Dispositifs > Dispositifs incitatifs > Conventionnement sans travaux'
      ]
    },
    'Dispositifs fiscaux': {
      precisions: ['Dispositifs > Dispositifs incitatifs > Dispositif fiscal']
    },
    'Prime locale': {
      precisions: [
        'Dispositifs > Dispositifs incitatifs > Prime locale vacance'
      ]
    },
    'Ma Prime Renov': {
      precisions: ['Dispositifs > Dispositifs incitatifs > Ma Prime Renov']
    },
    'Accompagnement à la vente': {
      precisions: [
        'Dispositifs > Dispositifs incitatifs > Accompagnement à la vente'
      ]
    },
    'Aides locales': {
      precisions: [
        'Dispositifs > Dispositifs incitatifs > Aides locales travaux'
      ]
    },
    Autre: {
      precisions: ['Dispositifs > Dispositifs incitatifs > Autre']
    },
    'ORI - TIRORI': {
      precisions: ['Dispositifs > Dispositifs coercitifs > ORI - TIRORI']
    },
    'Bien sans maitre': {
      precisions: ['Dispositifs > Dispositifs coercitifs > Bien sans maître']
    },
    'Abandon manifeste': {
      precisions: ['Dispositifs > Dispositifs coercitifs > Abandon manifeste']
    },
    'DIA - préemption': {
      precisions: ['Dispositifs > Dispositifs coercitifs > DIA - préemption']
    },
    'Procédure d’habitat indigne': {
      precisions: [
        'Dispositifs > Dispositifs coercitifs > Procédure d’habitat indigine'
      ]
    },
    'Vente en cours': {
      precisions: ['Mode opératoire > Mutation > En cours']
    },
    'Location en cours': {
      precisions: ['Mode opératoire > Location/Occupation > En cours']
    },
    'Rénovation (ou projet) en cours': {
      precisions: ['Mode opératoire > Travaux > En cours']
    },
    Loué: {
      precisions: ['Mode opératoire > Location/Occupation > Occupé'],
      occupancy: 'L'
    },
    Vendu: {
      precisions: ['Mode opératoire > Mutation > Effectuée'],
      occupancy: 'A'
    },
    'Occupation personnelle ou pour un proche': {
      precisions: ['Mode opératoire > Mutation > Effectuée'],
      occupancy: 'P'
    },
    'Occupé par le propriétaire ou proche': {
      precisions: ['Mode opératoire > Location/Occupation > Occupé'],
      occupancy: 'P'
    },
    'Cause inconnue': {
      occupancy: 'RS'
    },
    'N’est pas une résidence principale': {
      occupancy: 'RS'
    },
    'Autre que logement': {
      occupancy: 'T'
    },
    'N’est plus un logement': {
      occupancy: 'T'
    },
    'Réserve personnelle ou pour une autre personne': {
      precisions: [
        'Liés au propriétaire > Blocage volontaire > Réserve personnelle ou pour une autre personne'
      ]
    },
    'Montant travaux trop important': {
      precisions: [
        'Liés au propriétaire > Blocage involontaire > Problèmes de financements / Dossier non-éligible'
      ]
    },
    Dégradations: {
      precisions: [
        'Liés au propriétaire > Blocage involontaire > Défaut d’entretien / nécessité de travaux'
      ]
    },
    'Impayés de loyer': {
      precisions: [
        'Liés au propriétaire > Blocage volontaire > Mauvaise expérience locative'
      ]
    },
    'Succession difficile, indivision en désaccord': {
      precisions: [
        'Liés au propriétaire > Blocage involontaire > Succession difficile, indivision en désaccord'
      ]
    },
    'Expertise judiciaire': {
      precisions: [
        'Extérieurs au propriétaire > Tiers en cause > Expertise judiciaire'
      ]
    },
    'Procédure contre les entrepreneurs': {
      precisions: [
        'Extérieurs au propriétaire > Tiers en cause > Entreprise(s) en défaut'
      ]
    },
    'Âge du propriétaire': {
      precisions: [
        'Liés au propriétaire > Blocage involontaire > En incapacité (âge, handicap, précarité...)'
      ]
    },
    'Difficultés de gestion / financière': {
      precisions: [
        'Liés au propriétaire > Blocage involontaire > En incapacité (âge, handicap, précarité...)'
      ]
    },
    'Ne répond pas aux critères du marché (prix...)': {
      precisions: [
        'Liés au propriétaire > Blocage involontaire > Mise en location ou vente infructueuse'
      ]
    },
    'Aides non accordées': {
      precisions: [
        'Liés au propriétaire > Blocage involontaire > Problèmes de financements / Dossier non-éligible'
      ]
    },
    'Stratégie de gestion': {
      precisions: [
        'Liés au propriétaire > Blocage volontaire > Stratégie de gestion'
      ]
    }
  };

  const changes: Partial<Housing> = housing.precisions
    // Change or keep the precision as is
    .map((precision) => ({ precisions: [precision], ...map[precision] }))
    .reduce(
      (acc, changes) => ({
        ...acc,
        ...changes,
        precisions: acc.precisions.concat(
          changes.precisions?.filter((precision) => !removable.has(precision))
        )
      }),
      { precisions: [] }
    );
  return {
    ...housing,
    ...changes
  };
}

function mapVacancyReasons(housing: Housing): Housing {
  if (!housing.vacancy_reasons) {
    return housing;
  }

  const map: Record<string, Partial<Housing>> = {
    'Liée au logement - pas d’accès indépendant': {
      vacancy_reasons: [
        'Extérieurs au propriétaire > Immeuble / Environnement > Pas d’accès indépendant'
      ]
    },
    'Liée au logement - nuisances à proximité': {
      vacancy_reasons: [
        'Extérieurs au propriétaire > Immeuble / Environnement > Nuisances à proximité'
      ]
    },
    'Liée au logement - nécessité de travaux': {
      vacancy_reasons: [
        'Liés au propriétaire > Blocage involontaire > Défaut d’entretien / nécessité de travaux'
      ]
    },
    'Liée au logement - montant travaux trop important': {
      vacancy_reasons: [
        'Liés au propriétaire > Blocage involontaire > Problèmes de financements / Dossier non-éligible'
      ]
    },
    'Liée au logement - ruine / à démolir': {
      vacancy_reasons: [
        'Extérieurs au propriétaire > Immeuble / Environnement > Ruine / Immeuble à démolir'
      ]
    },
    'Liée à l’immeuble - blocage lié à la copropriété': {
      vacancy_reasons: [
        'Extérieurs au propriétaire > Tiers en cause > Copropriété en désaccord'
      ]
    },
    'Blocage juridique - succession difficile, indivision en désaccord': {
      vacancy_reasons: [
        'Liés au propriétaire > Blocage involontaire > Succession difficile, indivision en désaccord'
      ]
    },
    'Blocage juridique - expertise judiciaire': {
      vacancy_reasons: [
        'Extérieurs au propriétaire > Tiers en cause > Expertise judiciaire'
      ]
    },
    'Blocage juridique - procédure contre les entrepreneurs': {
      vacancy_reasons: [
        'Extérieurs au propriétaire > Tiers en cause > Entreprise(s) en défaut'
      ]
    },
    'Vacance volontaire - réserve personnelle': {
      vacancy_reasons: [
        'Liés au propriétaire > Blocage volontaire > Réserve personnelle ou pour une autre personne'
      ]
    },
    'Vacance volontaire - réserve pour une autre personne': {
      vacancy_reasons: [
        'Liés au propriétaire > Blocage volontaire > Réserve personnelle ou pour une autre personne'
      ]
    },
    'Mauvaise expérience locative - dégradations': {
      vacancy_reasons: [
        'Liés au propriétaire > Blocage volontaire > Mauvaise expérience locative'
      ]
    },
    'Mauvaise expérience locative - impayés de loyer': {
      vacancy_reasons: [
        'Liés au propriétaire > Blocage volontaire > Mauvaise expérience locative'
      ]
    },
    'Liée au propriétaire - âge du propriétaire': {
      vacancy_reasons: [
        'Liés au propriétaire > Blocage involontaire > En incapacité (âge, handicap, précarité...)'
      ]
    },
    'Liée au propriétaire - difficultés de gestion': {
      vacancy_reasons: [
        'Liés au propriétaire > Blocage involontaire > En incapacité (âge, handicap, précarité...)'
      ]
    }
  };

  const changes: Partial<Housing> = housing.vacancy_reasons
    .map((reason) => ({ vacancy_reasons: [reason], ...map[reason] }))
    .reduce(
      (acc, changes) => ({
        ...acc,
        ...changes,
        vacancy_reasons: acc.vacancy_reasons.concat(changes.vacancy_reasons)
      }),
      { vacancy_reasons: [] }
    );
  return {
    ...housing,
    ...changes
  };
}

export interface Housing {
  id: string;
  status: number;
  sub_status?: string;
  precisions?: string[];
  vacancy_reasons?: string[];
  occupancy: string;
  mutation_date: Date | null;
}

type HousingSerialized = Omit<Housing, 'status'> & {
  status: string;
  mutation_date: Date | null;
};

export enum HousingStatus {
  NeverContacted,
  Waiting,
  FirstContact,
  InProgress,
  NotVacant,
  NoAction,
  Exit
}

export interface HousingEvent {
  id: string;
  housing_id: string;
  name: string;
  kind: string;
  category: string;
  section: string;
  contact_kind?: string;
  conflict?: boolean;
  old?: HousingSerialized;
  new?: HousingSerialized;
  created_at: Date;
  created_by: string;
}

function denormalizeStatus(statuses: string[]) {
  return (housing: Housing): HousingSerialized => ({
    ...housing,
    status: statuses[housing.status]
  });
}

const denormalizeOldStatus = denormalizeStatus([
  'Jamais contacté',
  'En attente de retour',
  'Premier contact',
  'Suivi en cours',
  'Non-vacant',
  'Bloqué',
  'Sortie de la vacance'
]);

const denormalizeNewStatus = denormalizeStatus([
  'Non suivi',
  'En attente de retour',
  'Premier contact',
  'Suivi en cours',
  'Suivi terminé',
  'Bloqué',
  'Suivi terminé'
]);

function saveEvents(knex: Knex) {
  return async (events: HousingEvent[]): Promise<void> => {
    const housingEvents = events.map((event) => ({
      event_id: event.id,
      housing_id: event.housing_id
    }));
    const eventsWithoutHousingId = events.map(fp.omit(['housing_id']));

    if (eventsWithoutHousingId.length && housingEvents.length) {
      await knex('events').insert(eventsWithoutHousingId);
      await knex('housing_events').insert(housingEvents);
    }
  };
}

function saveHousingList(knex: Knex) {
  return async (housingList: Housing[]): Promise<void> => {
    if (housingList.length) {
      await knex('housing')
        .insert(housingList)
        .onConflict('id')
        .merge([
          'status',
          'sub_status',
          'precisions',
          'vacancy_reasons',
          'occupancy'
        ]);
    }
  };
}
