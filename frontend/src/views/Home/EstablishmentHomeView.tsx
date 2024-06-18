import { Col, Container, Row, Text } from '../../components/_dsfr';
import building from '../../assets/images/building.svg';
import hands_mail from '../../assets/images/hands-mail.svg';
import new_message from '../../assets/images/new_message.svg';
import people_search from '../../assets/images/people_search.svg';
import sync_files from '../../assets/images/sync_files.svg';
import statistic_chart from '../../assets/images/statistic_chart.svg';
import location_review from '../../assets/images/location_review.svg';
import real_time_collaboration from '../../assets/images/real_time_collaboration.svg';
import quote from '../../assets/images/quote.svg';
import quote_author from '../../assets/images/quote_author.svg';
import logo_caba from '../../assets/images/logo_caba.svg';
import logo_roanne_agglo from '../../assets/images/logo_roanne_agglo.png';
import logo_roubaix from '../../assets/images/logo_roubaix.png';
import logo_saint_lo_agglo from '../../assets/images/logo_saint_lo_agglo.png';
import logo_strasbourg from '../../assets/images/logo_strasbourg.png';
import logo_vire_normandie from '../../assets/images/logo_vire_normandie.jpg';
import collaboration from '../../assets/images/collaboration.svg';
import styles from './home.module.scss';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../models/TrackEvent';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';

const EstablishmentHomeView = () => {
  useDocumentTitle();
  const { trackEvent } = useMatomo();

  return (
    <>
      <Container as="main" spacing="py-7w mb-4w">
        <Row gutters>
          <Col>
            <Typography component="h1" variant="h4" mb={3}>
              Vous êtes une collectivité ?
            </Typography>
            <Typography component="h2" variant="h1" mb={3}>
              Diminuez la vacance de logements sur votre territoire
            </Typography>
            <Text size="lead" className="fr-py-4w">
              Zéro Logement Vacant aide les collectivités à mobiliser les
              propriétaires de logements vacants et à mieux les accompagner dans
              la remise sur le marché de leur logement.
            </Text>
            <div
              onClick={() =>
                trackEvent({
                  category: TrackEventCategories.Home,
                  action: TrackEventActions.Home.Connection
                })
              }
            >
              <Button
                linkProps={{ to: '/inscription/email' }}
                className="internal-link--btn"
              >
                Créer un compte
              </Button>
            </div>
          </Col>
          <Col className="align-right d-none d-sm-block">
            <img
              src={building}
              style={{ maxWidth: '100%', height: '100%' }}
              alt=""
            />
          </Col>
        </Row>
      </Container>
      <div className="bg-bf975">
        <Container as="section" spacing="py-7w mb-4w">
          <Row>
            <Col>
              <Typography component="h2" variant="h4" mb={3}>
                Concrètement, comment ça fonctionne ?
              </Typography>
            </Col>
          </Row>
          <Row gutters>
            <Col>
              <div>
                <img src={people_search} height="100%" alt="" />
              </div>
              <Text size="lg">
                Repérez et caractérisez les logements vacants puis élaborez
                votre stratégie de prise de contact des propriétaires.
              </Text>
            </Col>
            <Col>
              <div>
                <img src={new_message} height="100%" alt="" />
              </div>
              <Text size="lg">
                Contactez les propriétaires en utilisant les messages les plus
                adaptés grâce à notre guide et notre base de courriers.
              </Text>
            </Col>
            <Col>
              <div>
                <img src={sync_files} height="100%" alt="" />
              </div>
              <Text size="lg">
                Suivez chaque dossier avec votre équipe, étape par étape,
                jusqu’à la sortie de vacance du logement.
              </Text>
            </Col>
          </Row>
          <Row justifyContent="center" gutters spacing="mt-2w">
            <Button
              onClick={() => {
                trackEvent({
                  category: TrackEventCategories.Home,
                  action: TrackEventActions.Home.Webinar
                });
                window.open(
                  'https://calendly.com/julie_guittard/webinaire-de-presentation-zlv',
                  '_blank',
                  'noopener'
                );
              }}
            >
              Participer à un webinaire de présentation
            </Button>
          </Row>
        </Container>
      </div>
      <Container as="section" spacing="py-7w mb-4w">
        <Row>
          <Col>
            <Typography component="h2" variant="h4" mb={3}>
              Les avantages de Zéro Logement Vacant
            </Typography>
          </Col>
        </Row>
        <Row gutters>
          <Col>
            <div>
              <img src={statistic_chart} height="100%" alt="" />
            </div>
            <Typography component="h3" variant="h6" mb={3}>
              Une vision globale de votre territoire
            </Typography>
            <Text size="lg">
              Accédez à la base de tous les logements vacants ainsi qu’à des
              statistiques agrégées sur votre activité
            </Text>
          </Col>
          <Col>
            <div>
              <img src={location_review} height="100%" alt="" />
            </div>
            <Typography component="h3" variant="h6" mb={3}>
              Un historique du logement exhaustif
            </Typography>
            <Text size="lg">
              Ne perdez plus aucune information sur les logements, vos échanges
              avec les propriétaires
            </Text>
          </Col>
          <Col>
            <div>
              <img src={collaboration} height="100%" alt="" />
            </div>
            <Typography component="h3" variant="h6" mb={3}>
              Un suivi centralisé des dossiers
            </Typography>
            <Text size="lg">
              Grâce au travail collaboratif et aux accès partenaires, suivez
              tous les dossiers au même endroit
            </Text>
          </Col>
          <Col>
            <div>
              <img src={real_time_collaboration} height="100%" alt="" />
            </div>
            <Typography component="h3" variant="h6" mb={3}>
              Un accès à une large communauté de partage
            </Typography>
            <Text size="lg">
              Profitez de l’expérience de toute une communauté : bonnes
              pratiques, courriers envoyés...
            </Text>
          </Col>
        </Row>
      </Container>
      <div className="bg-bf975">
        <Container as="section" spacing="py-7w mb-4w">
          <Row>
            <Col>
              <Typography component="h2" variant="h4" mb={3}>
                Ce que notre communauté en dit
              </Typography>
            </Col>
          </Row>
          <Row gutters>
            <Col className={styles.quote}>
              <img src={quote} alt="" />
              <Text size="lg">
                «&nbsp;Zéro Logement vacant a permis une mise en œuvre plus
                rapide et efficiente de notre service de lutte contre les
                logements vacants. Tout cela dans un environnement permettant
                une prise en main facile et avec une équipe à l’écoute.&nbsp;»
              </Text>
              <Row>
                <Col n="2">
                  <img src={quote_author} alt="" width="100%" />
                </Col>
                <Col spacing="ml-2w">
                  <div>
                    <b>Camille Vasseur</b>
                  </div>
                  <i>
                    Responsable lutte contre les logements vacants
                    <br />
                    Ville de Roubaix
                  </i>
                </Col>
              </Row>
            </Col>
            <Col className={styles.quote}>
              <img src={quote} alt="" />
              <Text size="lg">
                «&nbsp;L’intégration de ZLV nous a permis de structurer et de
                lancer une action de lutte contre la vacance, qui n’existait pas
                précédemment. Nous avons aussi amélioré nos prises de contacts
                avec les propriétaires grâce aux ressources et retours
                d’expériences partagés par la communauté.&nbsp;»
              </Text>
              <Row>
                <Col n="2">
                  <img src={quote_author} alt="" width="100%" />
                </Col>
                <Col spacing="ml-2w">
                  <div>
                    <b>Camille Moreau</b>
                  </div>
                  <i>
                    Cheffe de projet Habitat
                    <br />
                    Bordeaux Métropole
                  </i>
                </Col>
              </Row>
            </Col>
            <Col className={styles.quote}>
              <img src={quote} alt="" />
              <Text size="lg">
                «&nbsp;Grâce à l’outil, nous avons pu partager une vision
                commune entre communes et EPCI et collaborer plus efficacement
                ensemble sur la mise en oeuvre de la politique de la vacance sur
                notre territoire.&nbsp;»
              </Text>
              <Row>
                <Col n="2">
                  <img src={quote_author} alt="" width="100%" />
                </Col>
                <Col spacing="ml-2w">
                  <div>
                    <b>Eliane Aubert</b>
                  </div>
                  <i>
                    Responsable Habitat, Urbanisme, Environnement
                    <br />
                    Communauté d’Agglo de Vesoul
                  </i>
                </Col>
              </Row>
            </Col>
          </Row>
          <Row gutters alignItems="middle">
            <Col n="2">
              <img src={logo_caba} width="100%" alt="" />
            </Col>
            <Col n="2">
              <img src={logo_roanne_agglo} width="100%" alt="" />
            </Col>
            <Col n="2">
              <img src={logo_roubaix} width="100%" alt="" />
            </Col>
            <Col n="2">
              <img src={logo_saint_lo_agglo} width="100%" alt="" />
            </Col>
            <Col n="2">
              <img src={logo_strasbourg} width="100%" alt="" />
            </Col>
            <Col n="2">
              <img src={logo_vire_normandie} width="100%" alt="" />
            </Col>
          </Row>
        </Container>
      </div>
      <Container as="section" spacing="py-7w mb-4w">
        <Row gutters>
          <Col n="3" className="align-center">
            <img
              src={hands_mail}
              style={{ maxWidth: '100%', height: '100%' }}
              alt=""
            />
          </Col>
          <Col n="6">
            <Text
              size="lead"
              bold
              className="color-bf925-active"
              spacing="mb-1w"
            >
              LA NEWSLETTER
            </Text>
            <Text size="lead" bold>
              Découvrez chaque mois les nouvelles 
              <span className="color-bf525">fonctionnalités</span>, des 
              <span className="color-bf525">retours d’expériences</span>  de
              collectivités, 
              <span className="color-bf525">les actualités</span> de la lutte
              contre la vacance.
            </Text>
            <Button
              onClick={() => {
                trackEvent({
                  category: TrackEventCategories.Home,
                  action: TrackEventActions.Home.Newsletter
                });
                window.open(
                  'https://890e031e.sibforms.com/serve/MUIEAOyQXgbbxeoLBFC_8fPLahr5i4-KkyF8EICd8AXv5i6NZwxkoUr19wL6NiGJmx7oxh3RxaIpLw4JA0ZDBsgjS1hABUiZm1m9hgKzFVCwmc6yxEO9yV3y2XlZ-esfbxBWPX7nKMTjfORZ7UQMNcM5bSK4gfnNYzC4hYTKBMItk6YhL0sCci7EVICIrpJw1Xli7zM1VGcry_0L',
                  '_blank',
                  'noopener'
                );
              }}
            >
              S’inscrire
            </Button>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default EstablishmentHomeView;
