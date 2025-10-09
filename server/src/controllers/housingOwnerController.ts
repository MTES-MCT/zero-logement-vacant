import type {
  BaseHousingOwnerDTO,
  HousingDTO
} from '@zerologementvacant/models';
import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'node:http2';

import OwnerMissingError from '~/errors/ownerMissingError';
import { createLogger } from '~/infra/logger';
import { toHousingDTO, type HousingRecordApi } from '~/models/HousingApi';
import type { HousingOwnerApi } from '~/models/HousingOwnerApi';
import type { OwnerApi } from '~/models/OwnerApi';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';
import ownerRepository from '~/repositories/ownerRepository';

const logger = createLogger('housingOwnerController');

interface PathParams extends Record<string, string> {
  id: string;
}

type OwnerHousingDTO = BaseHousingOwnerDTO & HousingDTO;

const listByOwner: RequestHandler<
  PathParams,
  ReadonlyArray<OwnerHousingDTO>
> = async (request, response): Promise<void> => {
  const { establishment, params } = request as AuthenticatedRequest<
    PathParams,
    ReadonlyArray<OwnerHousingDTO>
  >;
  logger.info('List housings by owners', {
    params,
    establishment,
  });

  const owner = await ownerRepository.get(params.id);
  if (!owner) {
    throw new OwnerMissingError(params.id);
  }

  const ownerHousings = await housingOwnerRepository.findByOwner(owner, {
    geoCodes: establishment.geoCodes
  });

  response
    .status(constants.HTTP_STATUS_OK)
    .json(ownerHousings.map(toOwnerHousingDTO));
};

function toOwnerHousingDTO(
  ownerHousing: Omit<HousingOwnerApi, keyof OwnerApi> & HousingRecordApi
): OwnerHousingDTO {
  const owner: BaseHousingOwnerDTO = {
    idprocpte: ownerHousing.idprocpte ?? null,
    idprodroit: ownerHousing.idprodroit ?? null,
    locprop: ownerHousing.locprop ?? null,
    propertyRight: ownerHousing.propertyRight,
    rank: ownerHousing.rank
  };

  return {
    ...toHousingDTO(ownerHousing),
    ...owner
  };
}

export default {
  listByOwner
};
