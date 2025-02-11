import { fr } from '@codegouvfr/react-dsfr';
import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface GroupOrCampaignCardProps {
  title: string;
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
      spacing="1.5rem"
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
      <Typography component="h2" variant="h4">
        {props.title}
      </Typography>
      <img src={props.image} alt="" />
      <Typography variant="body2">{props.description}</Typography>
      <Button {...props.buttonProps} priority="secondary">
        {props.button}
      </Button>
    </Stack>
  );
}

export default GroupOrCampaignCard;
