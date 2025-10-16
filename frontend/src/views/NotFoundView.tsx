import Button from '@codegouvfr/react-dsfr/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

function NotFoundView() {
  return (
    <Container title="Page non trouvée" maxWidth="xl" sx={{ py: '4rem' }}>
      <Typography component="h1" variant="h3" mb={3}>
        Page non trouvée
      </Typography>
      <Button linkProps={{ to: '/' }} priority="primary">
        Revenir à l’accueil
      </Button>
    </Container>
  );
}

export default NotFoundView;
