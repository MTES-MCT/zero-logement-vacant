import { RequestHandler } from 'msw';

import { campaignHandlers } from './campaign-handlers';
import { draftHandlers } from './draft-handlers';
import { housingHandlers } from './housing-handlers';
import { groupHandlers } from './group-handlers';

export const handlers: RequestHandler[] = [
  ...campaignHandlers,
  ...draftHandlers,
  ...groupHandlers,
  ...housingHandlers
];
