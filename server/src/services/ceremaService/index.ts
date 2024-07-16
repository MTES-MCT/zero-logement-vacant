import config from '~/infra/config';
import createMockCeremaService from './mockCeremaService';
import createCeremaService, { CeremaService } from './ceremaService';

const ceremaService: CeremaService = config.cerema.enabled
  ? createCeremaService()
  : createMockCeremaService();

export default ceremaService;
