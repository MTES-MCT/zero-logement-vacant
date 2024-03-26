import Tile from '@codegouvfr/react-dsfr/Tile';

import styles from './draft-downloader.module.scss';
import { Campaign } from '../../models/Campaign';

interface Props {
  campaign: Campaign;
}

function DraftDownloader(props: Props) {
  const description = props.campaign.file?.split('/').pop();
  const link = props.campaign.file;

  if (!link) {
    return null;
  }

  return (
    <Tile
      classes={{
        title: styles.title,
        link: styles.link,
      }}
      desc={description}
      enlargeLink
      horizontal
      imageAlt="Document"
      imageUrl="/dsfr/artwork/pictograms/document/document.svg"
      linkProps={{
        download: true,
        href: link,
      }}
      title="Télécharger les courriers et les destinataires"
    />
  );
}

export default DraftDownloader;
