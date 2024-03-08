import { Request, Response } from 'express';
import { constants } from 'http2';
import fp from 'lodash/fp';

import { DraftApi } from '../models/DraftApi';
import draftRepository from '../repositories/draftRepository';

interface DraftQuery {
  campaign?: string;
}

async function listDrafts(request: Request, response: Response) {
  const { query } = request;

  const filters = fp.pick(['campaign'], query) as DraftQuery;

  const drafts: DraftApi[] = await draftRepository.find({
    filters,
  });
  response.status(constants.HTTP_STATUS_OK).json(drafts);
}

const draftController = {
  listDrafts,
};

export default draftController;
