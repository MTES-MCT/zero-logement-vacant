import React, { useState } from 'react';
import { Text } from '../../components/dsfr/index';
import Map, { MapProps } from '../../components/Map/Map';
import { ViewState } from 'react-map-gl';
import {
  hasPerimetersFilter,
  HousingFilters,
} from '../../models/HousingFilters';
import GeoPerimetersModalLink from '../../components/modals/GeoPerimetersModal/GeoPerimetersModalLink';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import {
  excludeWith,
  includeExcludeWith,
  includeWith,
} from '../../utils/arrayUtils';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import Label from '../../components/Label/Label';
import { useHousingList } from '../../hooks/useHousingList';
import { displayHousingCount } from '../../models/HousingCount';
import { useCountHousingQuery } from '../../services/housing.service';
import fp from 'lodash/fp';

interface Props {
  filters: HousingFilters;
}
const HousingListMap = ({ filters }: Props) => {
  const [mapViewState, setMapViewState] = useState<MapProps['viewState']>();

  const { data: perimeters } = useListGeoPerimetersQuery();
  const { housingList } = useHousingList({
    filters,
    pagination: {
      paginate: false,
    },
  });

  const { data: housingCount } = useCountHousingQuery(
    fp.pick(['dataYearsIncluded', 'dataYearsExcluded', 'occupancies'])(filters)
  );
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
    <>
      <Text spacing="mb-2w">
        {displayHousingCount({
          filteredHousingCount,
          filteredOwnerCount,
          totalCount,
        })}
        <div className="d-inline-block fr-ml-2w">
          <GeoPerimetersModalLink />
        </div>
      </Text>
      <Label spacing="mb-1w">
        Les nombres affichés dans les cercles correspondent aux nombres
        d'immeubles.
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
    </>
  );
};

export default HousingListMap;
