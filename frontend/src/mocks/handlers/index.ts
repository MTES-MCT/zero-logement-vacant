import { RequestHandler } from 'msw';

import { authHandlers } from './auth-handlers';
import { banHandlers } from './ban-handlers';
import { campaignHandlers } from './campaign-handlers';
import { datafoncierHandlers } from './datafoncier-handlers';
import { draftHandlers } from './draft-handlers';
import { establishmentHandlers } from './establishment-handlers';
import { eventHandlers } from './event-handlers';
import { geoPerimeterHandlers } from './geo-perimeter-handlers';
import { groupHandlers } from './group-handlers';
import { housingHandlers } from './housing-handlers';
import { noteHandlers } from './note-handlers';
import { otherHandlers } from './other-handlers';
import { ownerHandlers } from './owner-handlers';
import { precisionHandlers } from './precision-handlers';
import { prospectHandlers } from './prospect-handlers';
import { signupLinksHandlers } from './signup-links-handlers';
import { userHandlers } from './user-handlers';

export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...banHandlers,
  ...campaignHandlers,
  ...datafoncierHandlers,
  ...draftHandlers,
  ...establishmentHandlers,
  ...eventHandlers,
  ...geoPerimeterHandlers,
  ...groupHandlers,
  ...housingHandlers,
  ...noteHandlers,
  ...ownerHandlers,
  ...precisionHandlers,
  ...prospectHandlers,
  ...signupLinksHandlers,
  ...userHandlers,
  // Special handlers
  ...otherHandlers
];
