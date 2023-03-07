import config from '../utils/config';
import authService from './auth.service';
import { GeoPerimeter } from '../models/GeoPerimeter';

const listGeoPerimeters = async (): Promise<GeoPerimeter[]> => {
  return await fetch(`${config.apiEndpoint}/api/geo/perimeters`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  }).then((_) => _.json());
};

const updateGeoPerimeter = async (
  geoPerimeterId: string,
  kind: string,
  name?: string
): Promise<void> => {
  return await fetch(
    `${config.apiEndpoint}/api/geo/perimeters/${geoPerimeterId}`,
    {
      method: 'PUT',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ kind, name }),
    }
  ).then(() => {});
};

const deleteGeoPerimeter = async (geoPerimeterId: string): Promise<void> => {
  return await fetch(
    `${config.apiEndpoint}/api/geo/perimeters/${geoPerimeterId}`,
    {
      method: 'DELETE',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
    }
  ).then(() => {});
};

const uploadGeoPerimeterFile = async (file: File): Promise<void> => {
  const formData: FormData = new FormData();
  formData.append('geoPerimeter', file, file.name);

  return await fetch(`${config.apiEndpoint}/api/geo/perimeters`, {
    method: 'POST',
    headers: { ...authService.authHeader() },
    body: formData,
  }).then(() => {});
};

const geoService = {
  listGeoPerimeters,
  updateGeoPerimeter,
  deleteGeoPerimeter,
  uploadGeoPerimeterFile,
};

export default geoService;
