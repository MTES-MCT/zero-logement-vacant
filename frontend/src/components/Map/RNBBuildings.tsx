import { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import type { MapMouseEvent } from 'maplibre-gl';

import config from '../../utils/config';

const SOURCE_ID = 'rnb-buildings';
const FILL_LAYER_ID = 'rnb-buildings-fill';
const OUTLINE_LAYER_ID = 'rnb-buildings-outline';

// Minimum zoom level to start loading buildings
const MIN_ZOOM_FOR_FETCH = 14;

// Debounce delay in milliseconds
const FETCH_DEBOUNCE_MS = 300;

interface Props {
  isVisible?: boolean;
  onBuildingClick?: (rnbId: string) => void;
}

interface RNBBuildingProperties {
  rnb_id: string;
  status: string;
}

type RNBFeatureCollection = FeatureCollection<MultiPolygon, RNBBuildingProperties>;

/**
 * Display RNB (Référentiel National des Bâtiments) building outlines on the map.
 * Dynamically fetches buildings based on the current viewport.
 */
function RNBBuildings(props: Props) {
  const { housingMap: map } = useMap();
  const isVisible = props.isVisible ?? true;
  const addedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [, setIsLoading] = useState(false);

  const fetchBuildings = useCallback(async () => {
    if (!map) return;

    const mapInstance = map.getMap();
    const zoom = mapInstance.getZoom();

    // Only fetch at sufficient zoom level
    if (zoom < MIN_ZOOM_FOR_FETCH) {
      // Clear existing data when zoomed out
      const source = mapInstance.getSource(SOURCE_ID);
      if (source && source.type === 'geojson') {
        (source as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: []
        });
      }
      return;
    }

    const bounds = mapInstance.getBounds();
    const minLon = bounds.getWest();
    const maxLon = bounds.getEast();
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();

    setIsLoading(true);

    try {
      const url = new URL('/api/rnb/buildings', config.apiEndpoint);
      url.searchParams.set('minLon', minLon.toString());
      url.searchParams.set('maxLon', maxLon.toString());
      url.searchParams.set('minLat', minLat.toString());
      url.searchParams.set('maxLat', maxLat.toString());
      url.searchParams.set('limit', '5000');

      const response = await fetch(url.toString());
      if (!response.ok) {
        console.warn('Failed to fetch RNB buildings:', response.status);
        return;
      }

      const geojson: RNBFeatureCollection = await response.json();

      // Update source data
      const source = mapInstance.getSource(SOURCE_ID);
      if (source && source.type === 'geojson') {
        (source as maplibregl.GeoJSONSource).setData(geojson);
      }
    } catch (error) {
      console.warn('Error fetching RNB buildings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [map]);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchBuildings();
    }, FETCH_DEBOUNCE_MS);
  }, [fetchBuildings]);

  useEffect(() => {
    if (!map) return;

    const mapInstance = map.getMap();

    const addSourceAndLayers = () => {
      // Prevent duplicate additions
      if (addedRef.current) return;
      if (mapInstance.getSource(SOURCE_ID)) return;

      try {
        // Add empty source that will be populated dynamically
        mapInstance.addSource(SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        mapInstance.addLayer({
          id: FILL_LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          minzoom: 14,
          paint: {
            'fill-color': '#e63946',
            'fill-opacity': 0.4
          }
        });

        mapInstance.addLayer({
          id: OUTLINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          minzoom: 14,
          paint: {
            'line-color': '#9d0208',
            'line-width': 1,
            'line-opacity': 0.8
          }
        });

        addedRef.current = true;

        // Initial fetch
        fetchBuildings();
      } catch (error) {
        console.warn('Failed to add RNB layers:', error);
      }
    };

    if (mapInstance.isStyleLoaded()) {
      addSourceAndLayers();
    } else {
      mapInstance.once('style.load', addSourceAndLayers);
    }

    // Listen for map movement
    mapInstance.on('moveend', debouncedFetch);

    // Handle click on RNB buildings
    const handleClick = (e: MapMouseEvent) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: [FILL_LAYER_ID]
      });
      if (features.length > 0) {
        const feature = features[0];
        const rnbId = feature.properties?.rnb_id;
        if (rnbId && props.onBuildingClick) {
          props.onBuildingClick(rnbId);
        }
      }
    };

    mapInstance.on('click', FILL_LAYER_ID, handleClick);

    // Change cursor on hover
    const handleMouseEnter = () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = '';
    };
    mapInstance.on('mouseenter', FILL_LAYER_ID, handleMouseEnter);
    mapInstance.on('mouseleave', FILL_LAYER_ID, handleMouseLeave);

    return () => {
      // Cleanup debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Remove event listeners
      mapInstance.off('moveend', debouncedFetch);
      mapInstance.off('click', FILL_LAYER_ID, handleClick);
      mapInstance.off('mouseenter', FILL_LAYER_ID, handleMouseEnter);
      mapInstance.off('mouseleave', FILL_LAYER_ID, handleMouseLeave);

      // Cleanup layers and source on unmount
      try {
        if (mapInstance.getLayer(OUTLINE_LAYER_ID)) {
          mapInstance.removeLayer(OUTLINE_LAYER_ID);
        }
        if (mapInstance.getLayer(FILL_LAYER_ID)) {
          mapInstance.removeLayer(FILL_LAYER_ID);
        }
        if (mapInstance.getSource(SOURCE_ID)) {
          mapInstance.removeSource(SOURCE_ID);
        }
        addedRef.current = false;
      } catch {
        // Map might already be destroyed
      }
    };
  }, [map, debouncedFetch, fetchBuildings, props.onBuildingClick]);

  // Update visibility
  useEffect(() => {
    if (!map) return;

    const mapInstance = map.getMap();

    try {
      if (mapInstance.getLayer(FILL_LAYER_ID)) {
        mapInstance.setPaintProperty(
          FILL_LAYER_ID,
          'fill-opacity',
          isVisible ? 0.4 : 0
        );
      }
      if (mapInstance.getLayer(OUTLINE_LAYER_ID)) {
        mapInstance.setPaintProperty(
          OUTLINE_LAYER_ID,
          'line-opacity',
          isVisible ? 0.8 : 0
        );
      }
    } catch {
      // Layer might not exist yet
    }
  }, [map, isVisible]);

  return null;
}

export default RNBBuildings;
