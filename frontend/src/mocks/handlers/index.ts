import { RequestHandler } from 'msw';

import { authHandlers } from './auth-handlers';
import { campaignHandlers } from './campaign-handlers';
import { datafoncierHandlers } from './datafoncier-handlers';
import { draftHandlers } from './draft-handlers';
import { eventHandlers } from './event-handlers';
import { geoPerimeterHandlers } from './geo-perimeter-handlers';
import { groupHandlers } from './group-handlers';
import { housingHandlers } from './housing-handlers';
import { noteHandlers } from './note-handlers';
import { ownerHandlers } from './owner-handlers';
import { signupLinksHandlers } from './signup-links-handlers';
import { userHandlers } from './user-handlers';
import { prospectHandlers } from './prospect-handlers';

export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...campaignHandlers,
  ...datafoncierHandlers,
  ...draftHandlers,
  ...eventHandlers,
  ...geoPerimeterHandlers,
  ...groupHandlers,
  ...housingHandlers,
  ...noteHandlers,
  ...ownerHandlers,
  ...prospectHandlers,
  ...signupLinksHandlers,
  ...userHandlers
];
