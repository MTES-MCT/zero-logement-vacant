import { Request, Response } from 'express';
import { constants } from 'http2';

import precisionRepository from '~/repositories/precisionRepository';
import { PrecisionDBO } from '~/repositories/precisionRepository';


async function listPrecisions(
  request: Request,
  response: Response<PrecisionDBO[]>
): Promise<void> {
  const precisions = await precisionRepository.find();
  response.status(constants.HTTP_STATUS_OK).json(precisions);
}

export default  {
  listPrecisions,
};;
