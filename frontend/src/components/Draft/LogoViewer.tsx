import { FileUploadDTO } from '@zerologementvacant/models';
import { Container } from '../_dsfr';
import styles from './draft.module.scss';

interface Props {
  index: number;
  logo: FileUploadDTO;
  onDelete(): void;
}

function LogoViewer(props: Readonly<Props>) {
  const logo = props.logo;

  return (
    logo && (
      <Container className={styles.imageView}>
        <img src={logo.content} alt={`logo de l'expéditeur numéro ${props.index}`} className="fr-mb-2w fr-mt-2w" />
        <button type="button" className="fr-btn fr-btn--secondary fr-btn--sm fr-mb-2w fr-icon-delete-line fr-btn--icon-left" onClick={() => props.onDelete()}>Supprimer</button>
      </Container>
    )
  );
}

export default LogoViewer;
