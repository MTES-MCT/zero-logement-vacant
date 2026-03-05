import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import type { ReactNode } from 'react';
import Icon from '~/components/ui/Icon';

interface Props {
  iconId: FrIconClassName | RiIconClassName;
  label: string;
  children: ReactNode;
  variant?: 'default' | 'muted';
}

const Card = styled(Stack)<{ ownerState: { variant: 'default' | 'muted' } }>(
  ({ ownerState }) => ({
    background:
      ownerState.variant === 'muted'
        ? fr.colors.decisions.background.default.grey.hover
        : fr.colors.decisions.background.contrast.info.default,
    borderRadius: '0.25rem',
    padding: '0.75rem 1rem'
  })
);

function CampaignStatCard(props: Readonly<Props>) {
  const variant = props.variant ?? 'default';
  const iconColor =
    variant === 'muted'
      ? fr.colors.decisions.text.default.grey.default
      : fr.colors.decisions.artwork.major.blueFrance.default;

  return (
    <Card ownerState={{ variant }} spacing="0.25rem" useFlexGap>
      <Stack
        direction="row"
        spacing="0.5rem"
        useFlexGap
        sx={{ alignItems: 'center' }}
      >
        <Icon name={props.iconId} color={iconColor} />
        <Typography
          variant="body2"
          sx={{
            color: fr.colors.decisions.text.default.grey.default,
            fontWeight: 500
          }}
        >
          {props.label}
        </Typography>
      </Stack>

      {props.children}
    </Card>
  );
}

export default CampaignStatCard;
