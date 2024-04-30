import Button from '@codegouvfr/react-dsfr/Button';

import MainContainer from '../components/MainContainer/MainContainer';

function NotFoundView() {
  return (
    <MainContainer title="Page non trouvée">
      <Button linkProps={{ to: '/' }} priority="primary">
        Revenir à l’accueil
      </Button>
    </MainContainer>
  );
}

export default NotFoundView;
