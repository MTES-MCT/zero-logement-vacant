import { BuildingDTO } from '@zerologementvacant/models';
import { RequestHandler } from 'express';
import { constants } from 'http2';
import BuildingMissingError from '~/errors/buildingMissingError';

import { toBuildingDTO } from '~/models/BuildingApi';
import buildingRepository from '~/repositories/buildingRepository';

interface BuildingQuery {
  id?: string[];
}

interface BuildingParams extends Record<string, string> {
  id: string;
}

const find: RequestHandler<never, BuildingDTO[], never, BuildingQuery> = async (
  request,
  response
): Promise<void> => {
  const query = request.query;

  const buildings = await buildingRepository.find({
    filters: {
      id: query.id
    }
  });
  response.status(constants.HTTP_STATUS_OK).json(buildings.map(toBuildingDTO));
};

const get: RequestHandler<BuildingParams, BuildingDTO> = async (
  request,
  response
): Promise<void> => {
  const { id } = request.params;

  const building = await buildingRepository.get(id);
  if (!building) {
    throw new BuildingMissingError(id);
  }

  response.status(constants.HTTP_STATUS_OK).json(toBuildingDTO(building));
};

const buildingController = {
  find,
  get
};

export default buildingController;
