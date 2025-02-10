import { Request, Response } from 'express';
import { constants } from 'http2';

import { Precision } from '@zerologementvacant/models';
import precisionRepository from '~/repositories/precisionRepository';
import { toPrecisionDTO } from '~/models/PrecisionApi';

async function find(request: Request, response: Response<Precision[]>) {
  const precisions = await precisionRepository.find();
  response
    .status(constants.HTTP_STATUS_OK)
    .json(precisions.map(toPrecisionDTO));
}

const precisionController = {
  find
};

export default precisionController;
