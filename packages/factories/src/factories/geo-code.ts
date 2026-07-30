import { faker } from '@faker-js/faker/locale/fr';

/**
 * Generate a metropolitan French INSEE geo code that maps to an existing
 * `fast_housing` partition. Rerolls the prefixes with no partition (overseas
 * `96`–`99`, the legacy Corsica `20`, and the invalid `00`/`*999`), while
 * still emitting proper Corsica `2A`/`2B` codes.
 */
export function genGeoCode(): string {
  const geoCode = faker.helpers.arrayElement([
    faker.location.zipCode(),
    faker.helpers.arrayElement(['2A', '2B']) +
      faker.string.numeric({ length: 3 })
  ]);
  const needsReroll =
    geoCode.startsWith('00') ||
    geoCode.startsWith('20') ||
    geoCode.startsWith('96') ||
    geoCode.startsWith('97') ||
    geoCode.startsWith('98') ||
    geoCode.startsWith('99') ||
    geoCode.endsWith('999');
  return needsReroll ? genGeoCode() : geoCode;
}
