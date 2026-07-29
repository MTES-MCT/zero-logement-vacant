import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { HOUSING_POINT_FIELDS } from '@zerologementvacant/models';

import Label from '~/components/Label/Label';
import Map from '~/components/Map/Map';
import { type GeoPerimeter } from '~/models/GeoPerimeter';
import type { Housing } from '~/models/Housing';
import { displayHousingCount } from '~/models/HousingCount';
import {
  hasPerimetersFilter,
  type HousingFilters
} from '~/models/HousingFilters';
import { useListGeoPerimetersQuery } from '~/services/geo.service';
import {
  useCountHousingQuery,
  useHousingPoints
} from '~/services/housing.service';
import {
  excludeWith,
  includeExcludeWith,
  includeWith
} from '~/utils/arrayUtils';

interface Props {
  filters: HousingFilters;
}
const HousingListMap = ({ filters }: Props) => {
  const { data: perimeters } = useListGeoPerimetersQuery();
  const { data: housingPoints } = useHousingPoints({
    filters,
    fields: HOUSING_POINT_FIELDS
  });
  // The map only needs a lightweight projection (markers + building panel);
  // `owner` is not fetched here and is shown as "Pas d’information" in the
  // panel. Cast to Housing[] since the map components are typed against the
  // full model.
  const housingList = housingPoints as Housing[] | undefined;

  const { data: housingCount } = useCountHousingQuery({
    dataFileYearsIncluded: filters.dataFileYearsIncluded,
    dataFileYearsExcluded: filters.dataFileYearsExcluded,
    occupancies: filters.occupancies
  });
  const totalCount = housingCount?.housing;

  const { data: count } = useCountHousingQuery(filters);
  const filteredHousingCount = count?.housing ?? 0;
  const filteredOwnerCount = count?.owners ?? 0;

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
      <Typography component="p" variant="body1" sx={{ mb: 0 }}>
        {displayHousingCount({
          filteredHousingCount,
          filteredOwnerCount,
          totalCount
        })}
      </Typography>
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
      />
    </Stack>
  );
};

export default HousingListMap;
