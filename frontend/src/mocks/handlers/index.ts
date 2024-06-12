import { RequestHandler } from 'msw';

import { campaignHandlers } from './campaign-handlers';
import { datafoncierHandlers } from './datafoncier-handlers';
import { draftHandlers } from './draft-handlers';
import { geoPerimeterHandlers } from './geo-perimeter-handlers';
import { groupHandlers } from './group-handlers';
import { housingHandlers } from './housing-handlers';
import { ownerHandlers } from './owner-handlers';

export const handlers: RequestHandler[] = [
  ...campaignHandlers,
  ...datafoncierHandlers,
  ...draftHandlers,
  ...geoPerimeterHandlers,
  ...groupHandlers,
  ...housingHandlers,
  ...ownerHandlers
];
