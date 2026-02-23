import Button from '@codegouvfr/react-dsfr/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

function NotFoundView() {
  return (
    <Container title="Page non trouvée" maxWidth="xl" sx={{ py: '4rem' }}>
      <Typography component="h1" variant="h3" mb={3}>
        Page non trouvée
      </Typography>
      <Typography className="fr-text--sm">Erreur 404</Typography>
      <Typography className="fr-text--xl">
        La page que vous cherchez est introuvable. Excusez-nous pour la gêne
        occasionnée.
      </Typography>
      <Typography className="fr-text--sm">
        Si vous avez tapé l&apos;adresse web dans le navigateur, vérifiez
        qu&apos;elle est correcte. La page n&apos;est peut-être plus disponible.
        Dans ce cas, pour continuer votre visite vous pouvez consulter notre
        page d&apos;accueil, ou effectuer une recherche avec notre moteur de
        recherche en haut de page. Sinon contactez-nous en utilisant
        l&apos;info-bulle en bas à droite pour que l&apos;on puisse vous
        rediriger vers la bonne information.
      </Typography>
      <Button linkProps={{ to: '/' }} priority="primary">
        Page d&apos;accueil
      </Button>
    </Container>
  );
}

export default NotFoundView;
