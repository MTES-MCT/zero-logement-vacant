import { useCallback, useState } from 'react';
import { Layer, Source, useMap } from 'react-map-gl/maplibre';

import { useMapLayerClick } from '../../hooks/useMapLayerClick';

const DECOUPAGE_ADMINISTRATIF_URL =
  'https://data.geopf.fr/tms/1.0.0/ADMIN_EXPRESS/{z}/{x}/{y}.pbf';

const LAYER_IDS = [
  'regions-fill-hover',
  'departements-fill-hover',
  'epcis-fill-hover',
  'communes-fill-hover'
];

// DSFR colors for each administrative level
const COLORS = {
  regions: '#a558a0', // purple
  departements: '#009081', // green
  epcis: '#417dc4', // blue
  communes: '#e18b76' // orange
};

interface BoundaryProperties {
  id: string;
  nom: string;
  [key: string]: unknown;
}

interface Props {
  fillOpacity?: number;
  onHover?: (properties: BoundaryProperties | null) => void;
  onClick?: (properties: BoundaryProperties) => void;
}

function AdministrativeBoundaries(props: Props) {
  const { fillOpacity = 0.2, onHover, onClick } = props;

  const { housingMap: map } = useMap();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleMouseClick = useCallback(
    (value: BoundaryProperties) => {
      debugger;
      onClick?.(value);
    },
    [onClick]
  );

  const handleMouseEnter = useCallback(
    (value: BoundaryProperties) => {
      setHoveredId(String(value.id));
      onHover?.(value);
    },
    [onHover]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    onHover?.(null);
  }, [onHover]);

  useMapLayerClick<BoundaryProperties>({
    layers: LAYER_IDS,
    map,
    onClick: handleMouseClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave
  });

  const makeFillPaint = (
    color: string
  ): maplibregl.FillLayerSpecification['paint'] => ({
    'fill-color': color,
    'fill-opacity': hoveredId
      ? [
          'case',
          ['==', ['to-string', ['get', 'id']], hoveredId],
          fillOpacity,
          0.2
        ]
      : 0.2
  });

  return (
    <Source
      id="decoupage-administratif"
      type="vector"
      tiles={[DECOUPAGE_ADMINISTRATIF_URL]}
      minzoom={0}
      maxzoom={14}
    >
      {/* Regions - visible at low zoom, placed below region borders */}
      <Layer
        beforeId="Limites - Region - Bordures"
        id="regions-fill-hover"
        type="fill"
        source-layer="region"
        minzoom={0}
        maxzoom={7}
        paint={makeFillPaint(COLORS.regions)}
      />
      {/* Départements - placed below department borders */}
      <Layer
        beforeId="Limites - Departement - Bordures"
        id="departements-fill-hover"
        type="fill"
        source-layer="departement"
        minzoom={7}
        maxzoom={9}
        paint={makeFillPaint(COLORS.departements)}
      />
      {/* EPCIs - placed below EPCI borders */}
      <Layer
        beforeId="Limites - EPCI - Bordures"
        id="epcis-fill-hover"
        type="fill"
        source-layer="epci"
        minzoom={9}
        maxzoom={11}
        paint={makeFillPaint(COLORS.epcis)}
      />
      {/* Communes - visible at high zoom, placed below commune borders */}
      <Layer
        beforeId="Limites - Commune - Bordures"
        id="communes-fill-hover"
        type="fill"
        source-layer="commune"
        minzoom={11}
        paint={makeFillPaint(COLORS.communes)}
      />
    </Source>
  );
}

export default AdministrativeBoundaries;
