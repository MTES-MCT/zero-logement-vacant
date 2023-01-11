import { ConsultUserService } from './consultUserService';
import config from '../../utils/config';
import createMockCeremaService from './mockCeremaService';
import createCeremaService from './ceremaService';

const ceremaService: ConsultUserService = config.cerema.enable
  ? createCeremaService()
  : createMockCeremaService();

export default ceremaService;
