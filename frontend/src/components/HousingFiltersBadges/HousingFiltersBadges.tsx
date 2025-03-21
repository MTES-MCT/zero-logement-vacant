import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  DataFileYear,
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory,
  Precision
} from '@zerologementvacant/models';
import fp from 'lodash/fp';
import { match, Pattern } from 'ts-pattern';

import { useCampaignList } from '../../hooks/useCampaignList';
import { useIntercommunalities } from '../../hooks/useIntercommunalities';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useAppSelector } from '../../hooks/useStore';
import { geoPerimeterOptions } from '../../models/GeoPerimeter';
import {
  allOccupancyOptions,
  beneficiaryCountOptions,
  buildingPeriodOptions,
  cadastralClassificationOptions,
  dataFileYearsExcludedOptions,
  dataFileYearsIncludedOptions,
  energyConsumptionOptions,
  getCampaignOptions,
  getIntercommunalityOptions,
  housingAreaOptions,
  housingCountOptions,
  HousingFilters,
  housingKindOptions,
  localityKindsOptions,
  multiOwnerOptions,
  noCampaignOption,
  ownerAgeOptions,
  ownerKindOptions,
  ownershipKindsOptions,
  roomsCountOptions,
  statusOptions,
  taxedOptions,
  vacancyRateOptions,
  vacancyYearOptions
} from '../../models/HousingFilters';
import {
  getSubStatusList,
  getSubStatusOptions
} from '../../models/HousingState';

import { CITIES_WITH_DISTRICTS } from '../../models/Locality';
import { getPrecision } from '../../models/Precision';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import { useFindPrecisionsQuery } from '../../services/precision.service';
import FilterBadges from '../FiltersBadges/FiltersBadges';

interface HousingFiltersBadgesProps {
  filters: HousingFilters;
  onChange?: (values: HousingFilters) => void;
  small?: boolean;
}

function HousingFiltersBadges(props: HousingFiltersBadgesProps) {
  const { filters, onChange, small } = props;
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );
  const campaigns = useCampaignList();
  const { data: geoPerimeters } = useListGeoPerimetersQuery();
  const { data: intercommunalities } = useIntercommunalities();
  const intercommunalityOptions = intercommunalities?.length
    ? getIntercommunalityOptions(intercommunalities)
    : [];

  function mergeDistricts(localities: string[]): string[] {
    const setGeoCodes = new Set(localities);
    for (const [city, districts] of Object.entries(CITIES_WITH_DISTRICTS)) {
      if (districts.every((d) => setGeoCodes.has(d))) {
        districts.forEach((d) => {
          setGeoCodes.delete(d);
        });
        setGeoCodes.add(city);
      }
    }
    return Array.from(setGeoCodes);
  }

  const { localitiesOptions } = useLocalityList(establishment?.id);

  const { data: precisions } = useFindPrecisionsQuery();
  const precisionOptions = precisions ?? [];

  const hasFilters = fp.keys(fp.omit(['groupIds'], filters)).length > 0;

  if (!hasFilters) {
    return null;
  }

  return (
    <Box
      className="fr-tags-group"
      sx={{ alignItems: 'baseline', margin: '0 !important' }}
    >
      <Typography sx={{ fontWeight: 700, mr: 1 }}>
        Filtre(s) sélectionné(s) :
      </Typography>
      <FilterBadges
        options={allOccupancyOptions}
        values={filters.occupancies}
        small={small}
        keepEmptyValue
        onChange={(values) => onChange?.({ occupancies: values })}
      />
      <FilterBadges
        options={ownerKindOptions}
        values={filters.ownerKinds}
        small={small}
        onChange={(values) => onChange?.({ ownerKinds: values })}
      />
      <FilterBadges
        options={ownerAgeOptions}
        values={filters.ownerAges}
        small={small}
        onChange={(values) => onChange?.({ ownerAges: values })}
      />
      <FilterBadges
        options={multiOwnerOptions}
        values={filters.multiOwners?.map((value) => (value ? 'true' : 'false'))}
        small={small}
        onChange={(values) =>
          onChange?.({ multiOwners: values.map((value) => value === 'true') })
        }
      />
      <FilterBadges
        options={beneficiaryCountOptions}
        values={filters.beneficiaryCounts}
        small={small}
        onChange={(values) => onChange?.({ beneficiaryCounts: values })}
      />
      <FilterBadges
        options={housingKindOptions}
        values={filters.housingKinds}
        small={small}
        onChange={(values) => onChange?.({ housingKinds: values })}
      />
      <FilterBadges
        options={housingAreaOptions}
        values={filters.housingAreas}
        small={small}
        onChange={(values) => onChange?.({ housingAreas: values })}
      />
      <FilterBadges
        options={roomsCountOptions}
        values={filters.roomsCounts}
        small={small}
        onChange={(values) => onChange?.({ roomsCounts: values })}
      />
      <FilterBadges
        options={cadastralClassificationOptions}
        values={filters.cadastralClassifications?.map(String)}
        small={small}
        onChange={(values) =>
          onChange?.({ cadastralClassifications: values.map(Number) })
        }
      />
      <FilterBadges
        options={buildingPeriodOptions}
        values={filters.buildingPeriods}
        small={small}
        onChange={(values) => onChange?.({ buildingPeriods: values })}
      />
      <FilterBadges
        options={vacancyYearOptions}
        values={filters.vacancyYears}
        small={small}
        onChange={(values) => onChange?.({ vacancyYears: values })}
      />
      <FilterBadges
        options={taxedOptions}
        values={filters.isTaxedValues?.map((value) =>
          value ? 'true' : 'false'
        )}
        small={small}
        onChange={(values) =>
          onChange?.({ isTaxedValues: values.map((value) => value === 'true') })
        }
      />
      <FilterBadges
        options={ownershipKindsOptions}
        values={filters.ownershipKinds}
        small={small}
        onChange={(values) => onChange?.({ ownershipKinds: values })}
      />
      <FilterBadges
        options={housingCountOptions}
        values={filters.housingCounts}
        small={small}
        onChange={(values) => onChange?.({ housingCounts: values })}
      />
      <FilterBadges
        options={vacancyRateOptions}
        values={filters.vacancyRates}
        small={small}
        onChange={(values) => onChange?.({ vacancyRates: values })}
      />
      <FilterBadges
        options={intercommunalityOptions}
        values={filters.intercommunalities}
        small={small}
        onChange={(value) => onChange?.({ intercommunalities: value })}
      />
      <FilterBadges
        options={localitiesOptions}
        values={mergeDistricts(filters.localities ?? [])}
        small={small}
        onChange={(values) => onChange?.({ localities: values })}
      />
      <FilterBadges
        options={localityKindsOptions}
        values={filters.localityKinds}
        small={small}
        onChange={(values) => onChange?.({ localityKinds: values })}
      />
      {geoPerimeters && (
        <FilterBadges
          options={geoPerimeterOptions(geoPerimeters).map((option) => ({
            ...option,
            badgeLabel: `Périmètre inclus : ${option.label}`
          }))}
          values={filters.geoPerimetersIncluded}
          small={small}
          onChange={(values) => onChange?.({ geoPerimetersIncluded: values })}
        />
      )}
      {geoPerimeters && (
        <FilterBadges
          options={geoPerimeterOptions(geoPerimeters).map((option) => ({
            ...option,
            badgeLabel: `Périmètre exclus : ${option.label}`
          }))}
          values={filters.geoPerimetersExcluded}
          small={small}
          onChange={(values) => onChange?.({ geoPerimetersExcluded: values })}
        />
      )}
      <FilterBadges
        options={statusOptions()}
        values={filters.statusList?.map(String)}
        small={small}
        onChange={(values) =>
          onChange?.({
            statusList: values.map(Number),
            subStatus: filters.subStatus?.filter(
              (_) => getSubStatusList(values).indexOf(_) !== -1
            )
          })
        }
      />
      <FilterBadges
        options={filters.statusList?.flatMap(getSubStatusOptions) ?? []}
        values={filters.subStatus}
        small={small}
        onChange={(values) => onChange?.({ subStatus: values })}
      />
      {campaigns && filters.campaignIds && (
        <FilterBadges
          options={getCampaignOptions(campaigns)}
          values={filters.campaignIds.map((id) =>
            id === null ? noCampaignOption.value : id
          )}
          small={small}
          onChange={(values) =>
            onChange?.({
              campaignIds: values.map((value) =>
                value === noCampaignOption.value ? null : value
              )
            })
          }
        />
      )}
      <FilterBadges
        options={dataFileYearsIncludedOptions}
        values={filters.dataFileYearsIncluded}
        small={small}
        onChange={(values: DataFileYear[]) =>
          onChange?.({ dataFileYearsIncluded: values })
        }
      />
      <FilterBadges
        options={dataFileYearsExcludedOptions}
        values={filters.dataFileYearsExcluded}
        small={small}
        onChange={(values: DataFileYear[]) =>
          onChange?.({ dataFileYearsExcluded: values })
        }
      />
      <FilterBadges
        options={energyConsumptionOptions}
        values={filters.energyConsumption}
        small={small}
        onChange={(values) => onChange?.({ energyConsumption: values })}
      />
      <FilterBadges
        options={[{ value: filters.query ?? '', label: filters.query ?? '' }]}
        values={filters.query ? [filters.query] : []}
        small={small}
        onChange={() => onChange?.({ query: '' })}
      />
      <FilterBadges
        options={precisionOptions.map((precision) => ({
          value: precision.id,
          label: precision.label,
          badgeLabel: `Dispositif : ${precision.label}`
        }))}
        values={
          filters.precisions
            ? filters.precisions
                .map(getPrecision(precisionOptions))
                .filter((precision) =>
                  isPrecisionMechanismCategory(precision.category)
                )
                .map((precision) => precision.id)
            : []
        }
        small={small}
        onChange={(values) => {
          const otherPrecisions = filters.precisions
            ?.map(getPrecision(precisionOptions))
            ?.filter(
              (precision) => !isPrecisionMechanismCategory(precision.category)
            );
          onChange?.({
            precisions: values
              .map(getPrecision(precisionOptions))
              .concat(otherPrecisions ?? [])
              .map((precision) => precision.id)
          });
        }}
      />
      <FilterBadges
        options={precisionOptions.map((precision) => ({
          value: precision.id,
          label: precision.label,
          badgeLabel: `Point de blocage : ${precision.label}`
        }))}
        values={
          filters.precisions
            ? filters.precisions
                .map(getPrecision(precisionOptions))
                .filter((precision) =>
                  isPrecisionBlockingPointCategory(precision.category)
                )
                .map((precision) => precision.id)
            : []
        }
        small={small}
        onChange={(values) => {
          const otherPrecisions = filters.precisions
            ?.map(getPrecision(precisionOptions))
            ?.filter(
              (precision) =>
                !isPrecisionBlockingPointCategory(precision.category)
            );
          onChange?.({
            precisions: values
              .map(getPrecision(precisionOptions))
              .concat(otherPrecisions ?? [])
              .map((precision) => precision.id)
          });
        }}
      />
      <FilterBadges
        options={precisionOptions.map((precision) => ({
          value: precision.id,
          label: precision.label,
          badgeLabel: `Évolution : ${mapPrecisionLabel(precision)}`
        }))}
        values={
          filters.precisions
            ? filters.precisions
                .map(getPrecision(precisionOptions))
                .filter((precision) =>
                  isPrecisionEvolutionCategory(precision.category)
                )
                .map((precision) => precision.id)
            : []
        }
        small={small}
        onChange={(values) => {
          const otherPrecisions = filters.precisions
            ?.map(getPrecision(precisionOptions))
            ?.filter(
              (precision) => !isPrecisionEvolutionCategory(precision.category)
            );
          onChange?.({
            precisions: values
              .map(getPrecision(precisionOptions))
              .concat(otherPrecisions ?? [])
              .map((precision) => precision.id)
          });
        }}
      />
    </Box>
  );
}

function mapPrecisionLabel(precision: Precision): string {
  return match(precision)
    .returnType<string>()
    .with(
      { label: Pattern.union('À venir', 'En cours', 'Effectuée', 'Terminés') },
      (precision) => `${precision.category} ${precision.label.toLowerCase()}`
    )
    .otherwise((precision) => precision.label.toLowerCase());
}

export default HousingFiltersBadges;
