import { fr } from '@codegouvfr/react-dsfr';
import { HousingStatus } from '@zerologementvacant/models';
import fp from 'lodash/fp';
import { NonEmptyArray } from 'ts-essentials';

const hex = fr.colors.getHex({ isDark: false });
const statuses = [
  HousingStatus.WAITING,
  HousingStatus.FIRST_CONTACT,
  HousingStatus.IN_PROGRESS,
  HousingStatus.COMPLETED,
  HousingStatus.BLOCKED
];
const backgroundColors = fp.zip(statuses, [
  hex.decisions.background.contrast.yellowTournesol.default,
  hex.decisions.background.contrast.blueCumulus.default,
  hex.decisions.background.contrast.orangeTerreBattue.default,
  hex.decisions.background.contrast.greenBourgeon.default,
  hex.decisions.background.contrast.purpleGlycine.default
]) as NonEmptyArray<[HousingStatus, string]>;
const textColors = fp.zip(statuses, [
  hex.decisions.text.label.yellowTournesol.default,
  hex.decisions.text.label.blueCumulus.default,
  hex.decisions.text.label.orangeTerreBattue.default,
  hex.decisions.text.label.greenBourgeon.default,
  hex.decisions.text.label.purpleGlycine.default
]) as NonEmptyArray<[HousingStatus, string]>;
const defaultBackgroundColor =
  hex.decisions.background.actionHigh.blueFrance.default;
const defaultTextColor = hex.decisions.text.inverted.grey.default;

const statusColors = {
  defaultBackgroundColor,
  defaultTextColor,
  backgroundColors,
  textColors
};

export default statusColors;
