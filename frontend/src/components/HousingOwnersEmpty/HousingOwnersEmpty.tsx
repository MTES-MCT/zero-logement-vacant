import Button, { type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import Avatar from '@codegouvfr/react-dsfr/picto/Avatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { MarkOptional } from 'ts-essentials';

export interface HousingOwnersEmptyProps {
  title: string;
  buttonProps?: MarkOptional<ButtonProps, 'children' | 'priority' | 'iconId'>;
}

const MAX_WIDTH = '20rem';

function HousingOwnersEmpty(props: HousingOwnersEmptyProps) {
  return (
    <Stack
      sx={{
        alignItems: 'center',
        px: '4rem',
        textAlign: 'center'
      }}
    >
      <Avatar width="7.5rem" height="7.5rem" />
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 500, mb: '1rem', maxWidth: MAX_WIDTH }}
      >
        {props.title}
      </Typography>
      <Button
        priority="secondary"
        iconId="fr-icon-add-line"
        {...props.buttonProps}
      >
        {props.buttonProps?.children ?? 'Ajouter un propriétaire'}
      </Button>
    </Stack>
  );
}

export default HousingOwnersEmpty;
