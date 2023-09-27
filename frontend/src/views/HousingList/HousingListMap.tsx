import React, { useState } from 'react';
import { Text } from '@dataesr/react-dsfr';
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

interface Props {
  filters: HousingFilters;
}
const HousingListMap = ({ filters }: Props) => {
  const [mapViewState, setMapViewState] = useState<MapProps['viewState']>();

  const { data: perimeters } = useListGeoPerimetersQuery();
  const { totalCount, paginatedHousing } = useHousingList({
    filters,
    pagination: {
      paginate: false,
    },
  });

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

  if (!paginatedHousing) {
    return <></>;
  }

  return (
    <>
      <Text spacing="mb-2w">
        {displayHousingCount({
          filteredCount: paginatedHousing.filteredCount,
          filteredOwnerCount: paginatedHousing.filteredOwnerCount,
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
        housingList={paginatedHousing.entities}
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
