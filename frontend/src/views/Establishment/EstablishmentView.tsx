import { Container, Text, Title } from '../../components/_dsfr';
import EstablishmentContactPoints from './EstablishmentContactPoints';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import EstablishmentLocalityTaxes from './EstablishmentLocalityTaxes';
import { useAppSelector } from '../../hooks/useStore';
import ContactPointPublicPage from '../../components/ContactPoint/ContactPointPublicPage';
import MainContainer from '../../components/MainContainer/MainContainer';
import Tabs from '@codegouvfr/react-dsfr/Tabs';

const EstablishmentView = () => {
  useDocumentTitle('Informations publiques');
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment,
  );

  if (!establishment) {
    return <></>;
  }

  return (
    <MainContainer title="Gestion des informations de votre page publique">
      <Container as="article" spacing="mb-2w px-0">
        <Text size="lg">
          Remplissez les détails de votre territoire ici pour informer le
          public. Cela aidera à diriger les propriétaires vers vos contacts
          locaux et à partager des informations sur la vacance. Les informations
          fournies ici seront publiées sur votre page publique, alors
          assurez-vous qu’elles soient précises et claires.
        </Text>
        <Tabs
          tabs={[
            {
              label: 'Vos guichets contact',
              content: (
                <EstablishmentContactPoints
                  establishmentId={establishment.id}
                />
              ),
            },
            {
              label: 'Taxes sur les logements vacants',
              content: (
                <EstablishmentLocalityTaxes
                  establishmentId={establishment.id}
                />
              ),
            },
          ]}
        ></Tabs>
      </Container>
      <Container as="article" spacing="px-0">
        <Title as="h3">Votre page publique</Title>
        <ContactPointPublicPage establishment={establishment} />
      </Container>
    </MainContainer>
  );
};

export default EstablishmentView;
