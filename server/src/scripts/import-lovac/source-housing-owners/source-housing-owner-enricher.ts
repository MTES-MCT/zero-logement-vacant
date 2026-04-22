import { TransformStream } from 'node:stream/web';
import db from '~/infra/database';
import { HousingOwnerDBO } from '~/repositories/housingOwnerRepository';
import { HousingRecordDBO } from '~/repositories/housingRepository';
import { OwnerDBO, Owners } from '~/repositories/ownerRepository';
import { SourceHousingOwner } from './source-housing-owner';

interface HousingOwnerEnrichment {
  housing: HousingRecordDBO | null;
  owners: ReadonlyArray<OwnerDBO>;
  existingHousingOwners: ReadonlyArray<HousingOwnerDBO>;
}

export type EnrichedSourceHousingOwners = {
  source: ReadonlyArray<SourceHousingOwner>;
  existing: HousingOwnerEnrichment;
};

export function createSourceHousingOwnerEnricher(): TransformStream<
  ReadonlyArray<SourceHousingOwner>,
  EnrichedSourceHousingOwners
> {
  return new TransformStream<
    ReadonlyArray<SourceHousingOwner>,
    EnrichedSourceHousingOwners
  >({
    async transform(group, controller) {
      const { geo_code: geoCode, local_id: localId } = group[0];
      const sourceIdpersonnes = group.map((sourceOwner) => sourceOwner.idpersonne);

      // Query 1: housing + existing housing owners (single JOIN)
      const rows: Array<HousingRecordDBO & Partial<HousingOwnerDBO>> =
        await db('fast_housing as h')
          .select([
            'h.*',
            'ho.owner_id',
            'ho.rank as ho_rank',
            'ho.start_date',
            'ho.end_date',
            'ho.origin',
            'ho.idprocpte as ho_idprocpte',
            'ho.idprodroit as ho_idprodroit',
            'ho.locprop_source as ho_locprop_source',
            'ho.locprop_relative_ban',
            'ho.locprop_distance_ban',
            'ho.property_right as ho_property_right'
          ])
          .leftJoin('owners_housing as ho', function (this: any) {
            this.on('ho.housing_geo_code', '=', 'h.geo_code').andOn(
              'ho.housing_id',
              '=',
              'h.id'
            );
          })
          .where('h.geo_code', geoCode)
          .andWhere('h.local_id', localId);

      if (rows.length === 0) {
        controller.enqueue({
          source: group,
          existing: { housing: null, owners: [], existingHousingOwners: [] }
        });
        return;
      }

      // Extract housing columns from first row (ho.* aliased to avoid collision)
      const firstRow = rows[0] as any;
      const housing: HousingRecordDBO = {
        id: firstRow.id,
        invariant: firstRow.invariant,
        local_id: firstRow.local_id,
        building_id: firstRow.building_id,
        address_dgfip: firstRow.address_dgfip,
        geo_code: firstRow.geo_code,
        longitude_dgfip: firstRow.longitude_dgfip,
        latitude_dgfip: firstRow.latitude_dgfip,
        cadastral_classification: firstRow.cadastral_classification,
        uncomfortable: firstRow.uncomfortable,
        vacancy_start_year: firstRow.vacancy_start_year,
        housing_kind: firstRow.housing_kind,
        rooms_count: firstRow.rooms_count,
        living_area: firstRow.living_area,
        cadastral_reference: firstRow.cadastral_reference,
        building_year: firstRow.building_year,
        mutation_date: firstRow.mutation_date,
        taxed: firstRow.taxed,
        data_years: firstRow.data_years,
        beneficiary_count: firstRow.beneficiary_count,
        building_location: firstRow.building_location,
        rental_value: firstRow.rental_value,
        condominium: firstRow.condominium,
        status: firstRow.status,
        sub_status: firstRow.sub_status,
        actual_dpe: firstRow.actual_dpe,
        energy_consumption_bdnb: firstRow.energy_consumption_bdnb,
        energy_consumption_at_bdnb: firstRow.energy_consumption_at_bdnb,
        occupancy_source: firstRow.occupancy_source,
        occupancy: firstRow.occupancy,
        occupancy_intended: firstRow.occupancy_intended,
        plot_id: firstRow.plot_id,
        building_group_id: firstRow.building_group_id,
        data_source: firstRow.data_source,
        data_file_years: firstRow.data_file_years,
        geolocation: firstRow.geolocation,
        geolocation_source: firstRow.geolocation_source,
        plot_area: firstRow.plot_area,
        last_mutation_date: firstRow.last_mutation_date,
        last_transaction_date: firstRow.last_transaction_date,
        last_transaction_value: firstRow.last_transaction_value,
        occupancy_history: firstRow.occupancy_history,
        last_mutation_type: firstRow.last_mutation_type
      };

      const existingHousingOwners: HousingOwnerDBO[] = rows
        .filter((r: any) => r.owner_id !== null && r.owner_id !== undefined)
        .map((r: any) => ({
          owner_id: r.owner_id,
          housing_id: housing.id,
          housing_geo_code: housing.geo_code,
          rank: r.ho_rank,
          start_date: r.start_date ?? null,
          end_date: r.end_date ?? null,
          origin: r.origin ?? null,
          idprocpte: r.ho_idprocpte ?? null,
          idprodroit: r.ho_idprodroit ?? null,
          locprop_source: r.ho_locprop_source ?? null,
          locprop_relative_ban: r.locprop_relative_ban ?? null,
          locprop_distance_ban: r.locprop_distance_ban ?? null,
          property_right: r.ho_property_right ?? null
        }));

      // Query 2: owners by idpersonne (source) + by id (existing housing owners)
      const existingOwnerIds = existingHousingOwners.map((ho) => ho.owner_id);
      const owners: OwnerDBO[] = await Owners()
        .whereIn('idpersonne', sourceIdpersonnes)
        .modify((qb) => {
          if (existingOwnerIds.length > 0) {
            qb.orWhereIn('id', existingOwnerIds);
          }
        });

      controller.enqueue({
        source: group,
        existing: { housing, owners, existingHousingOwners }
      });
    }
  });
}
