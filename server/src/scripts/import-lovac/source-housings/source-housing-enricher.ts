import { EventType } from '@zerologementvacant/models';
import { TransformStream } from 'node:stream/web';
import db from '~/infra/database';
import { EventRecordDBO } from '~/repositories/eventRepository';
import { HousingRecordDBO } from '~/repositories/housingRepository';
import { NoteRecordDBO } from '~/repositories/noteRepository';
import { SourceHousing } from './source-housing';

const CHUNK_SIZE = 500;

interface HousingEnrichment {
  housing: HousingRecordDBO | null;
  events: ReadonlyArray<EventRecordDBO<EventType>>;
  notes: ReadonlyArray<NoteRecordDBO>;
}

export type EnrichedSourceHousing = {
  source: SourceHousing;
  existing: HousingEnrichment;
};

export function createSourceHousingEnricher(): TransformStream<
  SourceHousing,
  EnrichedSourceHousing
> {
  const buffer: SourceHousing[] = [];

  async function flushBuffer(
    controller: TransformStreamDefaultController<EnrichedSourceHousing>
  ): Promise<void> {
    if (buffer.length === 0) return;
    const chunk = buffer.splice(0);

    const placeholders = chunk.map(() => '(?, ?)').join(', ');
    const values = chunk.flatMap((s) => [s.geo_code, s.local_id]);

    // db.raw is necessary here because Knex does not support multi-column IN clauses
    // natively: (geo_code, local_id) IN (...). All placeholders are '(?, ?)' literals —
    // no user input is interpolated into the template string.
    const { rows } = await db.raw<{
      rows: Array<
        HousingRecordDBO & {
          events: EventRecordDBO<EventType>[];
          notes: NoteRecordDBO[];
        }
      >;
    }>(
      `
      SELECT h.*,
        COALESCE(
          json_agg(DISTINCT to_jsonb(e.*)) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) AS events,
        COALESCE(
          json_agg(DISTINCT to_jsonb(n.*)) FILTER (WHERE n.id IS NOT NULL),
          '[]'
        ) AS notes
      FROM fast_housing h
      LEFT JOIN housing_events he
        ON he.housing_geo_code = h.geo_code AND he.housing_id = h.id
      LEFT JOIN events e
        ON e.id = he.event_id
        AND e.type IN ('housing:occupancy-updated', 'housing:status-updated')
      LEFT JOIN housing_notes hn
        ON hn.housing_geo_code = h.geo_code AND hn.housing_id = h.id
      LEFT JOIN notes n ON n.id = hn.note_id
      WHERE (h.geo_code, h.local_id) IN (${placeholders})
      GROUP BY h.geo_code, h.id
      `,
      values
    );

    const byKey = new Map(
      rows.map((r) => [`${r.geo_code}:${r.local_id}`, r])
    );

    for (const source of chunk) {
      const row = byKey.get(`${source.geo_code}:${source.local_id}`);
      if (!row) {
        controller.enqueue({
          source,
          existing: { housing: null, events: [], notes: [] }
        });
      } else {
        const { events, notes, ...housing } = row;
        controller.enqueue({
          source,
          existing: {
            housing: housing as HousingRecordDBO,
            events,
            notes
          }
        });
      }
    }
  }

  return new TransformStream<SourceHousing, EnrichedSourceHousing>({
    async transform(source, controller) {
      buffer.push(source);
      if (buffer.length >= CHUNK_SIZE) {
        await flushBuffer(controller);
      }
    },
    async flush(controller) {
      await flushBuffer(controller);
    }
  });
}
