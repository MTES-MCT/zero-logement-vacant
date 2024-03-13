import { Request, Response } from 'express';
import { constants } from 'http2';
import fp from 'lodash/fp';

import { DraftApi } from '../models/DraftApi';
import draftRepository, { DraftFilters } from '../repositories/draftRepository';
import { AuthenticatedRequest } from 'express-jwt';

interface DraftQuery {
  campaign?: string;
}

async function listDrafts(request: Request, response: Response) {
  const { auth, query } = request as AuthenticatedRequest;

  const filters: DraftFilters = {
    ...(fp.pick(['campaign'], query) as DraftQuery),
    establishment: auth.establishmentId,
  };

  const drafts: DraftApi[] = await draftRepository.find({
    filters,
  });
  response.status(constants.HTTP_STATUS_OK).json(drafts);
}

const draftController = {
  listDrafts,
};

export default draftController;
