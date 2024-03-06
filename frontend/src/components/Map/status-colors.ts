import { fr } from '@codegouvfr/react-dsfr';
import fp from 'lodash/fp';

import { HousingStatus } from '../../models/HousingState';

const hex = fr.colors.getHex({ isDark: false });
const statuses = [
  HousingStatus.Waiting,
  HousingStatus.FirstContact,
  HousingStatus.InProgress,
  HousingStatus.Completed,
  HousingStatus.Blocked,
];
const backgroundColors = fp.zip(statuses, [
  hex.decisions.background.contrast.yellowTournesol.default,
  hex.decisions.background.contrast.blueCumulus.default,
  hex.decisions.background.contrast.orangeTerreBattue.default,
  hex.decisions.background.contrast.greenBourgeon.default,
  hex.decisions.background.contrast.purpleGlycine.default,
]);
const textColors = fp.zip(statuses, [
  hex.decisions.text.label.yellowTournesol.default,
  hex.decisions.text.label.blueCumulus.default,
  hex.decisions.text.label.orangeTerreBattue.default,
  hex.decisions.text.label.greenBourgeon.default,
  hex.decisions.text.label.purpleGlycine.default,
]);
const defaultBackgroundColor =
  hex.decisions.background.actionHigh.blueFrance.default;
const defaultTextColor = hex.decisions.text.inverted.grey.default;

const statusColors = {
  defaultBackgroundColor,
  defaultTextColor,
  backgroundColors,
  textColors,
};

export default statusColors;
