import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { type ViewState } from 'react-map-gl/maplibre';

import { useFeatureFlagEnabled } from 'posthog-js/react';
import { Text } from '../../components/_dsfr';
import Label from '../../components/Label/Label';
import Map, { type MapProps } from '../../components/Map/Map';
import { type GeoPerimeter } from '../../models/GeoPerimeter';
import { displayHousingCount } from '../../models/HousingCount';
import {
  hasPerimetersFilter,
  type HousingFilters
} from '../../models/HousingFilters';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import {
  useCountHousingQuery,
  useFindHousingQuery
} from '../../services/housing.service';
import {
  excludeWith,
  includeExcludeWith,
  includeWith
} from '../../utils/arrayUtils';

interface Props {
  filters: HousingFilters;
}
const HousingListMap = ({ filters }: Props) => {
  const [mapViewState, setMapViewState] = useState<MapProps['viewState']>();

  const { data: perimeters } = useListGeoPerimetersQuery();
  const isNewHousingOwnerPagesEnabled = useFeatureFlagEnabled(
      'new-housing-owner-pages'
    );
    const { data: housingList } = useFindHousingQuery(
      {
        filters,
        pagination: {
          paginate: false
        }
      },
      {
        selectFromResult: ({ data, ...response }) => ({
          ...response,
          data: {
            ...data,
            // Keep ownerless housings if the feature flag is enabled
            entities: data?.entities?.filter((housing) =>
              isNewHousingOwnerPagesEnabled ? true : !!housing.owner
            )
          }
        })
      }
    );

  const { data: housingCount } = useCountHousingQuery({
    dataFileYearsIncluded: filters.dataFileYearsIncluded,
    dataFileYearsExcluded: filters.dataFileYearsExcluded,
    occupancies: filters.occupancies
  });
  const totalCount = housingCount?.housing;

  const { data: count } = useCountHousingQuery(filters);
  const filteredHousingCount = count?.housing ?? 0;
  const filteredOwnerCount = count?.owners ?? 0;

  function onMove(viewState: ViewState): void {
    setMapViewState(viewState);
  }

  const perimetersIncluded = filters.geoPerimetersIncluded?.length
    ? includeExcludeWith<GeoPerimeter, 'kind'>(
        filters.geoPerimetersIncluded,
        filters.geoPerimetersExcluded ?? [],
        (perimeter) => perimeter.kind
      )(perimeters ?? [])
    : [];

  const perimetersExcluded = filters.geoPerimetersExcluded?.length
    ? includeWith<GeoPerimeter, 'kind'>(
        filters.geoPerimetersExcluded ?? [],
        (perimeter) => perimeter.kind
      )(perimeters ?? [])
    : [];

  const remainingPerimeters = excludeWith<GeoPerimeter, 'kind'>(
    [...perimetersIncluded, ...perimetersExcluded].map((p) => p.kind),
    (perimeter) => perimeter.kind
  )(perimeters ?? []);

  if (!housingList) {
    return <></>;
  }

  return (
    <Stack direction="column">
      <Text spacing="mb-0">
        {displayHousingCount({
          filteredHousingCount,
          filteredOwnerCount,
          totalCount
        })}
      </Text>
      <Label spacing="mb-1w">
        Les nombres affichés dans les cercles correspondent aux nombres de
        bâtiments.
      </Label>
      <Map
        housingList={housingList}
        hasPerimetersFilter={hasPerimetersFilter(filters)}
        perimeters={remainingPerimeters}
        perimetersIncluded={perimetersIncluded}
        perimetersExcluded={perimetersExcluded}
        onMove={onMove}
        viewState={mapViewState}
      />
    </Stack>
  );
};

export default HousingListMap;
