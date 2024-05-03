import { createJestConfig } from '@craco/craco';

import cracoConfig = require('./craco.config.js');
const jestConfig = createJestConfig(cracoConfig);

export default jestConfig;
