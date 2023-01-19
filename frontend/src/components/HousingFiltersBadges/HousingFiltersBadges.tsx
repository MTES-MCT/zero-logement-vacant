import React, { useMemo } from 'react';
import {
  beneficiaryCountOptions,
  buildingPeriodOptions,
  cadastralClassificationOptions,
  campaignsCountOptions,
  dataYearsExcludedOptions,
  dataYearsIncludedOptions,
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
  vacancyRateOptions,
} from '../../models/HousingFilters';
import { useCampaignList } from '../../hooks/useCampaignList';
import FilterBadges from '../FiltersBadges/FiltersBadges';
import { campaignFullName } from '../../models/Campaign';
import { useGeoPerimeterList } from '../../hooks/useGeoPerimeterList';
import { geoPerimeterOptions } from '../../models/GeoPerimeter';
import {
  getSubStatusList,
  getSubStatusListOptions,
} from '../../models/HousingState';
import { TagGroup } from '@dataesr/react-dsfr';
import ButtonLink from '../ButtonLink/ButtonLink';
import styles from './housing-filters-badges.module.scss';
import { useLocalityList } from '../../hooks/useLocalityList';

interface HousingFiltersBadgesProps {
  filters: HousingFilters;
  onChange?: (value: any) => void;
  onReset?: () => void;
  small?: boolean;
}

const HousingFiltersBadges = ({
  filters,
  onChange,
  onReset,
  small,
}: HousingFiltersBadgesProps) => {
  const campaignList = useCampaignList();
  const geoPerimeters = useGeoPerimeterList();
  const { localitiesOptions } = useLocalityList();

  function reset() {
    onReset?.();
  }

  const canReset = useMemo<boolean>(() => !!onReset, [onReset]);

  if (!filters) {
    return null;
  }

  return (
    <TagGroup>
      <FilterBadges
        options={ownerKindOptions}
        filters={filters.ownerKinds}
        small={small}
        onChange={onChange && ((values) => onChange({ ownerKinds: values }))}
      />
      <FilterBadges
        options={ownerAgeOptions}
        filters={filters.ownerAges}
        small={small}
        onChange={onChange && ((values) => onChange({ ownerAges: values }))}
      />
      <FilterBadges
        options={multiOwnerOptions}
        filters={filters.multiOwners}
        small={small}
        onChange={onChange && ((values) => onChange({ multiOwners: values }))}
      />
      <FilterBadges
        options={beneficiaryCountOptions}
        filters={filters.beneficiaryCounts}
        small={small}
        onChange={
          onChange && ((values) => onChange({ beneficiaryCounts: values }))
        }
      />
      <FilterBadges
        options={housingKindOptions}
        filters={filters.housingKinds}
        small={small}
        onChange={onChange && ((values) => onChange({ housingKinds: values }))}
      />
      <FilterBadges
        options={housingAreaOptions}
        filters={filters.housingAreas}
        small={small}
        onChange={onChange && ((values) => onChange({ housingAreas: values }))}
      />
      <FilterBadges
        options={roomsCountOptions}
        filters={filters.roomsCounts}
        small={small}
        onChange={onChange && ((values) => onChange({ roomsCounts: values }))}
      />
      <FilterBadges
        options={cadastralClassificationOptions}
        filters={filters.cadastralClassifications}
        small={small}
        onChange={
          onChange &&
          ((values) => onChange({ cadastralClassifications: values }))
        }
      />
      <FilterBadges
        options={buildingPeriodOptions}
        filters={filters.buildingPeriods}
        small={small}
        onChange={
          onChange && ((values) => onChange({ buildingPeriods: values }))
        }
      />
      <FilterBadges
        options={vacancyDurationOptions}
        filters={filters.vacancyDurations}
        small={small}
        onChange={
          onChange && ((values) => onChange({ vacancyDurations: values }))
        }
      />
      <FilterBadges
        options={taxedOptions}
        filters={filters.isTaxedValues}
        small={small}
        onChange={onChange && ((values) => onChange({ isTaxedValues: values }))}
      />
      <FilterBadges
        options={ownershipKindsOptions}
        filters={filters.ownershipKinds}
        small={small}
        onChange={
          onChange && ((values) => onChange({ ownershipKinds: values }))
        }
      />
      <FilterBadges
        options={housingCountOptions}
        filters={filters.housingCounts}
        small={small}
        onChange={onChange && ((values) => onChange({ housingCounts: values }))}
      />
      <FilterBadges
        options={vacancyRateOptions}
        filters={filters.vacancyRates}
        small={small}
        onChange={onChange && ((values) => onChange({ vacancyRates: values }))}
      />
      <FilterBadges
        options={localitiesOptions}
        filters={filters.localities}
        small={small}
        onChange={onChange && ((values) => onChange({ localities: values }))}
      />
      <FilterBadges
        options={localityKindsOptions}
        filters={filters.localityKinds}
        small={small}
        onChange={onChange && ((values) => onChange({ localityKinds: values }))}
      />
      {geoPerimeters && (
        <FilterBadges
          options={geoPerimeterOptions(geoPerimeters)}
          filters={filters.geoPerimetersIncluded}
          small={small}
          onChange={
            onChange &&
            ((values) => onChange({ geoPerimetersIncluded: values }))
          }
        />
      )}
      {geoPerimeters && (
        <FilterBadges
          options={geoPerimeterOptions(geoPerimeters).map((option) => ({
            ...option,
            badgeLabel: `${option.label} exclu`,
          }))}
          filters={filters.geoPerimetersExcluded}
          small={small}
          onChange={
            onChange &&
            ((values) => onChange({ geoPerimetersExcluded: values }))
          }
        />
      )}
      <FilterBadges
        options={campaignsCountOptions}
        filters={filters.campaignsCounts}
        small={small}
        onChange={
          onChange && ((values) => onChange({ campaignsCounts: values }))
        }
      />
      <FilterBadges
        options={statusOptions()}
        filters={filters.status?.map((_) => _.toString())}
        small={small}
        onChange={
          onChange &&
          ((values) =>
            onChange({
              status: values,
              subStatus: filters.subStatus?.filter(
                (_) => getSubStatusList(values).indexOf(_) !== -1
              ),
            }))
        }
      />
      <FilterBadges
        options={getSubStatusListOptions(filters.status)}
        filters={filters.subStatus}
        small={small}
        onChange={onChange && ((values) => onChange({ subStatus: values }))}
      />
      {campaignList && filters.campaignIds && (
        <FilterBadges
          options={campaignList.map((c) => ({
            value: c.id,
            label: campaignFullName(c),
          }))}
          filters={filters.campaignIds}
          small={small}
          onChange={onChange && ((values) => onChange({ campaignIds: values }))}
        />
      )}
      <FilterBadges
        options={dataYearsIncludedOptions}
        filters={(filters.dataYearsIncluded ?? []).map((_) => String(_))}
        small={small}
        onChange={
          onChange && ((values) => onChange({ dataYearsIncluded: values }))
        }
      />
      <FilterBadges
        options={dataYearsExcludedOptions}
        filters={(filters.dataYearsExcluded ?? []).map((_) => String(_))}
        small={small}
        onChange={
          onChange && ((values) => onChange({ dataYearsExcluded: values }))
        }
      />
      <FilterBadges
        options={[{ value: filters.query ?? '', label: filters.query ?? '' }]}
        filters={filters.query ? [filters.query] : []}
        small={small}
        onChange={onChange && (() => onChange({ query: '' }))}
      />
      {canReset && (
        <ButtonLink className={styles.reinit} onClick={reset}>
          Réinitialiser les filtres
        </ButtonLink>
      )}
    </TagGroup>
  );
};

export default HousingFiltersBadges;
