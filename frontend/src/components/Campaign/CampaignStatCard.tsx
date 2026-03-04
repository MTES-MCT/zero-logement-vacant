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
}

const Card = styled(Stack)({
  borderRight: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
  padding: '0.75rem 1rem',
  '&:last-child': {
    borderRight: 'none'
  }
});

function CampaignStatCard(props: Readonly<Props>) {
  return (
    <Card spacing="0.25rem">
      <Stack direction="row" spacing="0.5rem" alignItems="center">
        <Icon name={props.iconId} size="sm" />
        <Typography variant="body2" color="text.secondary">
          {props.label}
        </Typography>
      </Stack>
      {props.children}
    </Card>
  );
}

export default CampaignStatCard;
