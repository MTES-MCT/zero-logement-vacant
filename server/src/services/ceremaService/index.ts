import config from '~/infra/config';
import createMockCeremaService from './mockCeremaService';
import createCeremaService from './ceremaService';
import { ConsultUserService } from './consultUserService';

const ceremaService: ConsultUserService = config.cerema.enabled
  ? createCeremaService()
  : createMockCeremaService();

export default ceremaService;
