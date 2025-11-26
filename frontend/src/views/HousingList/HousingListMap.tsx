import Stack from '@mui/material/Stack';

import { Text } from '../../components/_dsfr';
import Label from '~/components/Label/Label';
import Map from '~/components/Map/Map';
import { type GeoPerimeter } from '~/models/GeoPerimeter';
import { displayHousingCount } from '~/models/HousingCount';
import {
  hasPerimetersFilter,
  type HousingFilters
} from '~/models/HousingFilters';
import { useListGeoPerimetersQuery } from '~/services/geo.service';
import {
  useCountHousingQuery,
  useFindHousingQuery
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
  const { data } = useFindHousingQuery({
    filters,
    pagination: {
      paginate: false
    }
  });
  const housingList = data?.entities;

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
      />
    </Stack>
  );
};

export default HousingListMap;
