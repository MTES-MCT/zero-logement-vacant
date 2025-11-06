import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import type { ReactNode } from 'react';

interface GroupOrCampaignCardProps {
  title: ReactNode;
  description: string;
  image: string;
  button: string;
  buttonProps?: Omit<ButtonProps.AsButton, 'priority'>;
}

function GroupOrCampaignCard(props: GroupOrCampaignCardProps) {
  return (
    <Stack
      component="article"
      direction="column"
      sx={{
        alignItems: 'center',
        background: fr.colors.decisions.background.default.grey,
        border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
        borderRadius: '0.0625rem',
        height: '100%',
        justifyContent: 'center',
        padding: '1.5rem 2rem',
        textAlign: 'center'
      }}
    >
      <Typography component="h2" sx={{ mb: 1 }} variant="h6">
        {props.title}
      </Typography>
      <Typography variant="body2">{props.description}</Typography>
      <img src={props.image} alt="" width={120} height={120} />
      <Button className="fr-mt-3w" {...props.buttonProps} priority="secondary">
        {props.button}
      </Button>
    </Stack>
  );
}

export default GroupOrCampaignCard;
