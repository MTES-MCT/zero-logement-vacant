import {
  allOccupancyOptions,
  beneficiaryCountOptions,
  buildingPeriodOptions,
  cadastralClassificationOptions,
  campaignsCountOptions,
  dataFileYearsExcludedOptions,
  dataFileYearsIncludedOptions,
  energyConsumptionOptions,
  housingAreaOptions,
  housingCountOptions,
  HousingFilters,
  housingKindOptions,
  localityKindsOptions,
  multiOwnerOptions,
  ownerAgeOptions,
  ownerKindOptions,
  ownershipKindsOptions,
  roomsCountOptions,
  statusOptions,
  taxedOptions,
  vacancyDurationOptions,
  vacancyRateOptions
} from '../../models/HousingFilters';
import { useCampaignList } from '../../hooks/useCampaignList';
import FilterBadges from '../FiltersBadges/FiltersBadges';
import { geoPerimeterOptions } from '../../models/GeoPerimeter';
import {
  getSubStatusList,
  getSubStatusListOptions
} from '../../models/HousingState';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useAppSelector } from '../../hooks/useStore';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import fp from 'lodash/fp';

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
  const campaignList = useCampaignList();
  const { data: geoPerimeters } = useListGeoPerimetersQuery();
  const { localitiesOptions } = useLocalityList(establishment?.id);

  const hasFilters = fp.keys(fp.omit(['groupIds'], filters)).length > 0;

  if (!hasFilters) {
    return null;
  }

  return (
    <div className="fr-tags-group">
      <FilterBadges
        options={allOccupancyOptions}
        filters={filters.occupancies}
        small={small}
        keepEmptyValue
        onChange={(values) => onChange?.({ occupancies: values })}
      />
      <FilterBadges
        options={ownerKindOptions}
        filters={filters.ownerKinds}
        small={small}
        onChange={(values) => onChange?.({ ownerKinds: values })}
      />
      <FilterBadges
        options={ownerAgeOptions}
        filters={filters.ownerAges}
        small={small}
        onChange={(values) => onChange?.({ ownerAges: values })}
      />
      <FilterBadges
        options={multiOwnerOptions}
        filters={filters.multiOwners?.map((value) =>
          value ? 'true' : 'false'
        )}
        small={small}
        onChange={(values) =>
          onChange?.({ multiOwners: values.map((value) => value === 'true') })
        }
      />
      <FilterBadges
        options={beneficiaryCountOptions}
        filters={filters.beneficiaryCounts}
        small={small}
        onChange={(values) => onChange?.({ beneficiaryCounts: values })}
      />
      <FilterBadges
        options={housingKindOptions}
        filters={filters.housingKinds}
        small={small}
        onChange={(values) => onChange?.({ housingKinds: values })}
      />
      <FilterBadges
        options={housingAreaOptions}
        filters={filters.housingAreas}
        small={small}
        onChange={(values) => onChange?.({ housingAreas: values })}
      />
      <FilterBadges
        options={roomsCountOptions}
        filters={filters.roomsCounts}
        small={small}
        onChange={(values) => onChange?.({ roomsCounts: values })}
      />
      <FilterBadges
        options={cadastralClassificationOptions}
        filters={filters.cadastralClassifications}
        small={small}
        onChange={(values) => onChange?.({ cadastralClassifications: values })}
      />
      <FilterBadges
        options={buildingPeriodOptions}
        filters={filters.buildingPeriods}
        small={small}
        onChange={(values) => onChange?.({ buildingPeriods: values })}
      />
      <FilterBadges
        options={vacancyDurationOptions}
        filters={filters.vacancyDurations}
        small={small}
        onChange={(values) => onChange?.({ vacancyDurations: values })}
      />
      <FilterBadges
        options={taxedOptions}
        filters={filters.isTaxedValues?.map((value) =>
          value ? 'true' : 'false'
        )}
        small={small}
        onChange={(values) =>
          onChange?.({ isTaxedValues: values.map((value) => value === 'true') })
        }
      />
      <FilterBadges
        options={ownershipKindsOptions}
        filters={filters.ownershipKinds}
        small={small}
        onChange={(values) => onChange?.({ ownershipKinds: values })}
      />
      <FilterBadges
        options={housingCountOptions}
        filters={filters.housingCounts}
        small={small}
        onChange={(values) => onChange?.({ housingCounts: values })}
      />
      <FilterBadges
        options={vacancyRateOptions}
        filters={filters.vacancyRates}
        small={small}
        onChange={(values) => onChange?.({ vacancyRates: values })}
      />
      <FilterBadges
        options={localitiesOptions}
        filters={filters.localities}
        small={small}
        onChange={(values) => onChange?.({ localities: values })}
      />
      <FilterBadges
        options={localityKindsOptions}
        filters={filters.localityKinds}
        small={small}
        onChange={(values) => onChange?.({ localityKinds: values })}
      />
      {geoPerimeters && (
        <FilterBadges
          options={geoPerimeterOptions(geoPerimeters)}
          filters={filters.geoPerimetersIncluded}
          small={small}
          onChange={(values) => onChange?.({ geoPerimetersIncluded: values })}
        />
      )}
      {geoPerimeters && (
        <FilterBadges
          options={geoPerimeterOptions(geoPerimeters).map((option) => ({
            ...option,
            badgeLabel: `${option.label} exclu`
          }))}
          filters={filters.geoPerimetersExcluded}
          small={small}
          onChange={(values) => onChange?.({ geoPerimetersExcluded: values })}
        />
      )}
      <FilterBadges
        options={campaignsCountOptions}
        filters={filters.campaignsCounts}
        small={small}
        onChange={(values) => onChange?.({ campaignsCounts: values })}
      />
      <FilterBadges
        options={statusOptions()}
        filters={filters.statusList?.map(String)}
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
        options={getSubStatusListOptions(filters.statusList ?? [])}
        filters={filters.subStatus}
        small={small}
        onChange={(values) => onChange?.({ subStatus: values })}
      />
      {campaignList && filters.campaignIds && (
        <FilterBadges
          options={campaignList.map((c) => ({
            value: c.id,
            label: c.title
          }))}
          filters={filters.campaignIds}
          small={small}
          onChange={(values) => onChange?.({ campaignIds: values })}
        />
      )}
      <FilterBadges
        options={dataFileYearsIncludedOptions}
        filters={filters.dataFileYearsIncluded}
        small={small}
        onChange={(values) => onChange?.({ dataFileYearsIncluded: values })}
      />
      <FilterBadges
        options={dataFileYearsExcludedOptions}
        filters={filters.dataFileYearsExcluded}
        small={small}
        onChange={(values) => onChange?.({ dataFileYearsExcluded: values })}
      />
      <FilterBadges
        options={energyConsumptionOptions}
        filters={filters.energyConsumption}
        small={small}
        onChange={(values) => onChange?.({ energyConsumption: values })}
      />
      <FilterBadges
        options={[{ value: filters.query ?? '', label: filters.query ?? '' }]}
        filters={filters.query ? [filters.query] : []}
        small={small}
        onChange={() => onChange?.({ query: '' })}
      />
    </div>
  );
}

export default HousingFiltersBadges;
