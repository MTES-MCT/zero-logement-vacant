import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import { HousingStatus } from '@zerologementvacant/models';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

interface Props {
  isOpen: boolean;
  onClose(): void;
}

const hex = fr.colors.getHex({ isDark: false });

const STATUS_LEGEND_ITEMS: Array<{
  status: HousingStatus;
  label: string;
  backgroundColor: string;
  borderColor: string;
}> = [
  {
    status: HousingStatus.NEVER_CONTACTED,
    label: 'Logement non suivi',
    backgroundColor: hex.decisions.background.actionHigh.blueFrance.default,
    borderColor: hex.decisions.text.inverted.grey.default
  },
  {
    status: HousingStatus.WAITING,
    label: 'Logement en attente de retour',
    backgroundColor:
      hex.decisions.background.contrast.yellowTournesol.default,
    borderColor: hex.decisions.text.label.yellowTournesol.default
  },
  {
    status: HousingStatus.FIRST_CONTACT,
    label: 'Logement en premier contact',
    backgroundColor: hex.decisions.background.contrast.blueCumulus.default,
    borderColor: hex.decisions.text.label.blueCumulus.default
  },
  {
    status: HousingStatus.IN_PROGRESS,
    label: 'Logement suivi en cours',
    backgroundColor:
      hex.decisions.background.contrast.orangeTerreBattue.default,
    borderColor: hex.decisions.text.label.orangeTerreBattue.default
  },
  {
    status: HousingStatus.COMPLETED,
    label: 'Logement suivi terminé',
    backgroundColor: hex.decisions.background.contrast.greenBourgeon.default,
    borderColor: hex.decisions.text.label.greenBourgeon.default
  },
  {
    status: HousingStatus.BLOCKED,
    label: 'Logement bloqué',
    backgroundColor: hex.decisions.background.contrast.purpleGlycine.default,
    borderColor: hex.decisions.text.label.purpleGlycine.default
  }
];

const Panel = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isOpen'
})<{ isOpen: boolean }>(({ isOpen }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: '19.25rem',
  zIndex: 2,
  backgroundColor: hex.decisions.background.default.grey.default,
  borderRight: `1px solid ${hex.decisions.border.default.grey.default}`,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  padding: '1rem 1rem 1rem 1.5rem',
  transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.3s ease-in-out',
  pointerEvents: isOpen ? 'auto' : 'none'
}));

const SectionTitle = styled(Typography)({
  fontWeight: 700,
  fontSize: '1rem',
  lineHeight: '1.5rem',
  color: hex.decisions.text.title.grey.default
});

const ItemLabel = styled(Typography)({
  fontSize: '0.75rem',
  lineHeight: '1.25rem',
  color: hex.decisions.text.default.grey.default,
  flex: 1
});

const CircleIcon = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'backgroundColor' && prop !== 'borderColor'
})<{ backgroundColor: string; borderColor: string }>(
  ({ backgroundColor, borderColor }) => ({
    width: '1.125rem',
    height: '1.125rem',
    borderRadius: '50%',
    backgroundColor,
    border: `1px solid ${borderColor}`,
    flexShrink: 0
  })
);

const SquareIcon = styled(Box)({
  width: '1.125rem',
  height: '1.125rem',
  border: `1px solid ${hex.decisions.border.plain.grey.default}`,
  flexShrink: 0
});

const ClusterIcon = styled(Box)({
  width: '1.125rem',
  height: '1.125rem',
  borderRadius: '50%',
  backgroundColor: hex.decisions.background.contrast.blueFrance.default,
  border: `1px solid ${hex.decisions.border.plain.blueFrance.default}`,
  color: hex.decisions.text.label.blueFrance.default,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.5rem',
  fontWeight: 700,
  flexShrink: 0
});

const OutlineCircleIcon = styled(Box)({
  width: '1.125rem',
  height: '1.125rem',
  borderRadius: '50%',
  border: `1px solid ${hex.decisions.border.plain.grey.default}`,
  flexShrink: 0
});

function MapLegend(props: Readonly<Props>) {
  return (
    <Panel isOpen={props.isOpen} role="region" aria-label="Légende de la carte">
      <Stack direction="row" justifyContent="flex-end">
        <Button
          iconId="fr-icon-close-line"
          iconPosition="left"
          onClick={props.onClose}
          priority="tertiary no outline"
          size="small"
          title="Fermer la légende"
        >
          Fermer
        </Button>
      </Stack>

      <Stack gap="0.5rem">
        <SectionTitle>Localisation</SectionTitle>

        <Stack direction="row" gap="0.5rem" alignItems="center">
          <OutlineCircleIcon />
          <ItemLabel>Rond : Logement unique à l&apos;adresse</ItemLabel>
        </Stack>

        <Stack direction="row" gap="0.5rem" alignItems="center">
          <SquareIcon />
          <ItemLabel>Carré : Plusieurs logements à l&apos;adresse</ItemLabel>
        </Stack>

        <Stack direction="row" gap="0.5rem" alignItems="center">
          <ClusterIcon aria-hidden="true">44</ClusterIcon>
          <ItemLabel>Nombre de bâtiments</ItemLabel>
        </Stack>
      </Stack>

      <Stack gap="0.5rem">
        <SectionTitle>Suivi</SectionTitle>

        {STATUS_LEGEND_ITEMS.map(
          ({ status, label, backgroundColor, borderColor }) => (
            <Stack
              key={status}
              direction="row"
              gap="0.5rem"
              alignItems="center"
            >
              <CircleIcon
                backgroundColor={backgroundColor}
                borderColor={borderColor}
              />
              <ItemLabel>{label}</ItemLabel>
            </Stack>
          )
        )}
      </Stack>
    </Panel>
  );
}

export default MapLegend;
