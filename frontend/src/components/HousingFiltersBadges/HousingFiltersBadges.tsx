import {
  allOccupancyOptions,
  beneficiaryCountOptions,
  buildingPeriodOptions,
  cadastralClassificationOptions,
  dataFileYearsExcludedOptions,
  dataFileYearsIncludedOptions,
  energyConsumptionOptions,
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
  vacancyYearOptions,
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
import { useFindPrecisionsQuery } from '../../services/precision.service';
import fp from 'lodash/fp';
import { useIntercommunalities } from '../../hooks/useIntercommunalities';
import { SelectOption } from '../../models/SelectOption';

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
  const { data: precisions } = useFindPrecisionsQuery();
  const intercommunalityOptions =
    intercommunalities?.map<SelectOption>((intercommunality) => ({
      value: intercommunality.id,
      label: intercommunality.name
    })) ?? [];
  const { localitiesOptions } = useLocalityList(establishment?.id);

  const hasFilters = fp.keys(fp.omit(['groupIds'], filters)).length > 0;

  if (!hasFilters) {
    return null;
  }

  // TODO: refactor
  const blocagesCategory = ["blocage-volontaire", "blocage-involontaire", "immeuble-environnement", "tiers-en-cause"];
  const dispositifsCategory = ["dispositifs-incitatifs", "dispositifs-coercitifs", "hors-dispositif-public"];
  const evolutionsCategory = ["mutation", "occupation", "travaux"];
  const disabledFilters = [ ...blocagesCategory, ...dispositifsCategory, ...evolutionsCategory ];

  return (
    <div className="fr-tags-group">
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
        values={filters.localities}
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
          options={geoPerimeterOptions(geoPerimeters)}
          values={filters.geoPerimetersIncluded}
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
        options={getSubStatusListOptions(filters.statusList ?? [])}
        values={filters.subStatus}
        small={small}
        onChange={(values) => onChange?.({ subStatus: values })}
      />
      {campaigns && filters.campaignIds && (
        <FilterBadges
          options={campaigns
            .map((campaign) => ({
              value: campaign.id,
              label: campaign.title
            }))
            .concat(noCampaignOption)}
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
        onChange={(values) => onChange?.({ dataFileYearsIncluded: values })}
      />
      <FilterBadges
        options={dataFileYearsExcludedOptions}
        values={filters.dataFileYearsExcluded}
        small={small}
        onChange={(values) => onChange?.({ dataFileYearsExcluded: values })}
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
        options={(precisions ?? [])
          .map((precision) => ({
            value: precision.id,
            label: precision.label
          }))
          .concat(noCampaignOption)}
        values={filters.precisions?.filter((precision) => !disabledFilters.includes(precision))}
        small={small}
        onChange={(values) => onChange?.({ precisions: values })}
      />
    </div>
  );
}

export default HousingFiltersBadges;
