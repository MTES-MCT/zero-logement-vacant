const ISO_COUNTRY_CODES = `
  AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ
  BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR
  CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
  GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU
  ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ
  LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ
  MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF
  PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI
  SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR
  TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`
  .trim()
  .split(/\s+/);

const FRENCH_COUNTRY_CODES = new Set([
  'FR',
  'BL',
  'GF',
  'GP',
  'MF',
  'MQ',
  'NC',
  'PF',
  'PM',
  'RE',
  'WF',
  'YT'
]);

const STREET_OR_BUILDING_TERMS = [
  'allee',
  'avenue',
  'batiment',
  'boulevard',
  'chemin',
  'cours',
  'impasse',
  'place',
  'promenade',
  'quai',
  'residence',
  'route',
  'rue',
  'square',
  'tour',
  'villa'
];

function normalizeCountryEvidence(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FOREIGN_COUNTRY_TERMS = (() => {
  const displayNames = [
    new Intl.DisplayNames(['en'], { type: 'region' }),
    new Intl.DisplayNames(['fr'], { type: 'region' })
  ];

  return new Set(
    ISO_COUNTRY_CODES.filter((code) => !FRENCH_COUNTRY_CODES.has(code)).flatMap(
      (code) =>
        displayNames.flatMap((names) => {
          const name = names.of(code);
          return name ? [normalizeCountryEvidence(name)] : [];
        })
    )
  );
})();

function isCountryTermPartOfStreetName(
  normalizedAddress: string,
  countryTerm: string
): boolean {
  const streetTerms = STREET_OR_BUILDING_TERMS.join('|');
  const pattern = new RegExp(
    String.raw`\b(?:${streetTerms})\s+(?:(?:de|du|des|d|l|la|le|les)\s+){0,2}${countryTerm}\b`
  );
  return pattern.test(normalizedAddress);
}

export function hasExplicitForeignCountry(label: string | undefined): boolean {
  if (!label?.trim()) {
    return false;
  }

  const normalized = normalizeCountryEvidence(label);
  const components = label
    .split(/[,;\n\r|]+/)
    .map(normalizeCountryEvidence)
    .filter(Boolean);
  const lastComponent = components.at(-1);

  for (const countryTerm of FOREIGN_COUNTRY_TERMS) {
    if (normalized === countryTerm) {
      return true;
    }
    if (components.length > 1 && lastComponent === countryTerm) {
      return true;
    }
    if (
      /\d/.test(normalized) &&
      normalized.endsWith(` ${countryTerm}`) &&
      !isCountryTermPartOfStreetName(normalized, countryTerm)
    ) {
      return true;
    }
  }

  return false;
}
