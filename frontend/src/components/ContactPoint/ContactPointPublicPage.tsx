import {
  Button,
  Col,
  Container,
  Icon,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';

import { Establishment } from '../../models/Establishment';
import styles from './contact-point-public-page.module.scss';
import { useClipboard } from '../../hooks/useClipboard';

interface Props {
  establishment: Establishment;
}

function ContactPointPublicPage(props: Props) {
  const link = 'https://zerologementvacant.beta.gouv.fr/dunkerque';

  const clipboard = useClipboard();

  async function copyLink() {
    await clipboard.copy(link);
  }

  return (
    <Container as="section" fluid className={styles.container}>
      <Row gutters>
        <Col n="3" className={styles.frame}>
          Image
        </Col>
        <Col n="9" spacing="pl-4w">
          <Title as="h5">Page publique de {props.establishment.name}</Title>
          <Text>
            Cette page publique sert à communiquer les informations relatives la
            vacance sur votre territoire. Elle permettra aux propriétaires de
            logements vacants de se renseigner sur les coordonnées... Pour cela
            il est nécessaire que les informations sur les pages
            <Text as="span" bold>
               informations territoire 
            </Text>
            soient mises à jour et lisibles.
          </Text>
          <Row>
            <Col>
              <Text className={styles.disabled}>{link}</Text>
            </Col>
            <Button secondary className="fr-mr-1w" onClick={copyLink}>
              <Icon name="ri-file-copy-line" iconPosition="left" size="1x" />
              {clipboard.copied ? 'Copié !' : 'Copier le lien'}
            </Button>
            <Button>
              <Icon name="ri-eye-fill" iconPosition="left" size="1x" />
              S’y rendre
            </Button>
          </Row>
        </Col>
      </Row>
    </Container>
  );
}

export default ContactPointPublicPage;
