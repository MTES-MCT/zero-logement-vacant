import Typography from '@mui/material/Typography';
import { isDefined } from '@zerologementvacant/utils';
import { useMemo } from 'react';

import { useIntercommunalities } from '~/hooks/useIntercommunalities';
import { useLocalityList } from '~/hooks/useLocalityList';
import { useAppSelector } from '~/hooks/useStore';
import { getCity, getDistricts } from '~/models/Locality';
import SearchableSelectNext from '~/components/SearchableSelectNext/SearchableSelectNext';

interface Props {
  intercommunalities?: string[];
  value: string[];
  onChange: (values: string[]) => void;
}

function LocalitySearchableSelect(props: Props) {
  const authData = useAppSelector(
    (state) => state.authentication.logIn.data
  );
  const establishment = authData?.establishment;
  // effectiveGeoCodes is undefined when no perimeter restriction applies
  const effectiveGeoCodes = authData?.effectiveGeoCodes;

  const { localities, listLocalitiesQuery } = useLocalityList(
    establishment?.id ?? null
  );

  const { data: intercommunalities } = useIntercommunalities();

  // Filter by intercommunalities (user-selected filter)
  const allowedByIntercommunalities = useMemo(() => {
    if (!props.intercommunalities?.length || !intercommunalities) {
      return null;
    }

    return new Set(
      intercommunalities
        .filter((interco) => props.intercommunalities?.includes(interco.id))
        .flatMap((interco) => interco.geoCodes)
    );
  }, [props.intercommunalities, intercommunalities]);

  // Filter by user's perimeter (from Portail DF)
  const allowedByPerimeter = useMemo(() => {
    if (!effectiveGeoCodes) {
      return null; // No perimeter restriction
    }
    return new Set(effectiveGeoCodes);
  }, [effectiveGeoCodes]);

  const sortedOptions = useMemo(() => {
    if (!localities) return [];

    const filtered = localities.filter((locality) => {
      if (getDistricts(locality.geoCode) !== null) return false;
      // First apply perimeter restriction (if any)
      if (allowedByPerimeter && !allowedByPerimeter.has(locality.geoCode)) {
        return false;
      }
      // Then apply intercommunalities filter (if any)
      if (allowedByIntercommunalities && !allowedByIntercommunalities.has(locality.geoCode)) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const cityA = getCity(a.geoCode) ?? '';
      const cityB = getCity(b.geoCode) ?? '';
      return cityA.localeCompare(cityB);
    });
  }, [localities, allowedByPerimeter, allowedByIntercommunalities]);

  const localityMap = useMemo(() => {
    if (!localities) return new Map();
    return new Map(localities.map((locality) => [locality.geoCode, locality]));
  }, [localities]);

  const selectedValues = useMemo(() => {
    if (listLocalitiesQuery.isFetching) return [];

    return props.value
      .map((geoCode) => {
        const option = localityMap.get(geoCode);
        if (!option) {
          console.error(`Locality ${geoCode} not found`);
        }
        return option;
      })
      .filter(isDefined);
  }, [listLocalitiesQuery.isFetching, props.value, localityMap]);

  return (
    <SearchableSelectNext
      multiple
      disabled={sortedOptions.length === 0}
      label="Commune"
      placeholder="Rechercher une commune"
      options={sortedOptions}
      isOptionEqualToValue={(option, value) =>
        option.geoCode === value.geoCode
      }
      getOptionLabel={(option) => option.name}
      groupBy={(option) => {
        const city = getCity(option.geoCode);
        return city ?? '';
      }}
      renderGroup={(group) => {
        const city = localities?.find(
          (locality) => locality.geoCode === group
        );
        return (
          <Typography
            sx={{ mt: '0.125rem', fontWeight: 700 }}
            variant="body2"
          >
            {city?.name ?? group}
          </Typography>
        );
      }}
      loading={listLocalitiesQuery.isFetching}
      value={selectedValues}
      onChange={(values) => {
        props.onChange(values.map((value) => value.geoCode));
      }}
    />
  );
}

export default LocalitySearchableSelect;
