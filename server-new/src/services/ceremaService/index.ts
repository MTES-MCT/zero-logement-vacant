import config from '~/config';
import { ConsultUserService } from './consultUserService';
import createMockCeremaService from './mockCeremaService';
import createCeremaService from './ceremaService';

const ceremaService: ConsultUserService = config.cerema.enabled
  ? createCeremaService()
  : createMockCeremaService();

export default ceremaService;
