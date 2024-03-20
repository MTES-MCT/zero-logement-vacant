import Tile from '@codegouvfr/react-dsfr/Tile';

import styles from './draft-downloader.module.scss';
import { Campaign } from '../../models/Campaign';
import config from '../../utils/config';

interface Props {
  campaign: Campaign;
}

function DraftDownloader(props: Props) {
  const description = props.campaign.file;
  const link = `${config.apiEndpoint}/api/files/${props.campaign.file}`;

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
