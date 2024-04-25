import config from '../../utils/config';
import createMockCeremaService from './mockCeremaService';
import createCeremaService, { CeremaService } from './ceremaService';

const ceremaService: CeremaService = config.cerema.enable
  ? createCeremaService()
  : createMockCeremaService();

export default ceremaService;
