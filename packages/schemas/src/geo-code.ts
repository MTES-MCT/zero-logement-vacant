import { string } from 'yup';

export const GEO_CODE_REGEXP = /^(2A|2B|[0-9][1-9]|[1-9][0-9])[0-9]{3}$/;

export const geoCode = string()
  .trim()
  .length(5)
  .matches(GEO_CODE_REGEXP, { excludeEmptyString: true });
