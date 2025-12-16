import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useKeyPressEvent } from 'react-use';

export interface DocumentCyclingBarProps {
  index: number;
  total: number;
  onPrevious(): void;
  onNext(): void;
}

function DocumentCyclingBar(props: DocumentCyclingBarProps) {
  const { index, total, onPrevious, onNext } = props;

  useKeyPressEvent('ArrowLeft', onPrevious);
  useKeyPressEvent('ArrowRight', onNext);

  return (
    <Stack
      direction="row"
      sx={{
        backgroundColor: fr.colors.decisions.background.default.grey.default,
        padding: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '64rem',
        width: '100%'
      }}
    >
      <Button
        priority="secondary"
        iconId="fr-icon-arrow-left-s-line"
        iconPosition="left"
        onClick={onPrevious}
      >
        Document précédent
      </Button>

      <Typography
        variant="subtitle2"
        sx={{
          color: fr.colors.decisions.text.title.grey.default,
          fontWeight: 500
        }}
      >
        {index + 1} / {total}
      </Typography>

      <Button
        priority="secondary"
        iconId="fr-icon-arrow-right-s-line"
        iconPosition="right"
        onClick={onNext}
      >
        Document suivant
      </Button>
    </Stack>
  );
}

export default DocumentCyclingBar;
