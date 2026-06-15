import config from '~/infra/config';

import createCeremaService from './ceremaService';
import { ConsultUserService } from './consultUserService';
import createMockCeremaService from './mockCeremaService';

const ceremaService: ConsultUserService = config.cerema.enabled
  ? createCeremaService()
  : createMockCeremaService();

export default ceremaService;
