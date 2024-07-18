import { Col, Container, Icon, Row, Text } from '../_dsfr';

import { Establishment, getEstablishmentUrl } from '../../models/Establishment';
import styles from './contact-point-public-page.module.scss';
import { useClipboard } from '../../hooks/useClipboard';
import homepage_thumbnail from '../../assets/images/homepage_thumbnail.png';
import Button from '@codegouvfr/react-dsfr/Button';
import AppLink from '../_app/AppLink/AppLink';
import Typography from '@mui/material/Typography';

interface Props {
  establishment: Establishment;
}

function ContactPointPublicPage({ establishment, }: Props) {
  const link = `${window.location.protocol}//${
    window.location.hostname
  }${getEstablishmentUrl(establishment)}`;

  const clipboard = useClipboard();

  async function copyLink() {
    await clipboard.copy(link);
  }

  return (
    <Container as="section" fluid className={styles.container}>
      <Row gutters>
        <Col n="3" className={styles.frame}>
          <img src={homepage_thumbnail} alt="" />
        </Col>
        <Col n="9" spacing="pl-4w">
          <Typography variant="h5" mb={3}>
            Page publique de {establishment.name}
          </Typography>
          <Text>
            Cette page publique sert à communiquer auprès des propriétaires les
            informations relatives à la lutte contre la vacance sur votre
            territoire. Elle permet aux propriétaires de se renseigner et de
            prendre contact avec vous à travers un formulaire. Les réponses à ce
            formulaire sont lisibles dans votre boîte de réception ZLV.
          </Text>
          <Row>
            <Col n="6">
              <Text className={styles.disabled}>{link}</Text>
            </Col>
            <Col n="6" className="align-right">
              <Button
                priority="secondary"
                className="fr-mr-1w"
                onClick={copyLink}
                iconId="fr-icon-file-add-fill"
              >
                {clipboard.copied ? 'Copié !' : 'Copier le lien'}
              </Button>
              <AppLink to={link} className="fr-btn" target="_blank">
                <Icon name="fr-icon-eye-fill" iconPosition="left" size="1x" />
                S’y rendre
              </AppLink>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
}

export default ContactPointPublicPage;
