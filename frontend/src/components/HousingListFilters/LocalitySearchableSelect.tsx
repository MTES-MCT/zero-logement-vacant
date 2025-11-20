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
  const establishment = useAppSelector(
    (state) => state.authentication.logIn.data?.establishment
  );

  const { localities, listLocalitiesQuery } = useLocalityList(
    establishment?.id ?? null
  );

  const { data: intercommunalities } = useIntercommunalities();

  const allowedGeoCodes = useMemo(() => {
    if (!props.intercommunalities?.length || !intercommunalities) {
      return null;
    }

    return new Set(
      intercommunalities
        .filter((interco) => props.intercommunalities?.includes(interco.id))
        .flatMap((interco) => interco.geoCodes)
    );
  }, [props.intercommunalities, intercommunalities]);

  const sortedOptions = useMemo(() => {
    if (!localities) return [];

    const filtered = localities.filter((locality) => {
      if (getDistricts(locality.geoCode) !== null) return false;
      if (!allowedGeoCodes) return true;
      return allowedGeoCodes.has(locality.geoCode);
    });

    return filtered.sort((a, b) => {
      const cityA = getCity(a.geoCode) ?? '';
      const cityB = getCity(b.geoCode) ?? '';
      return cityA.localeCompare(cityB);
    });
  }, [localities, allowedGeoCodes]);

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
