import Tile from '@codegouvfr/react-dsfr/Tile';

import styles from './draft-downloader.module.scss';
import config from '../../utils/config';
import authService from '../../services/auth.service';
import type { Campaign } from '../../models/Campaign';

interface Props {
  campaign: Campaign;
  setDownloaded: (state: boolean) => void;
}

function DraftDownloader(props: Readonly<Props>) {
  const description = props.campaign.file;
  const link = `${config.apiEndpoint}/api/campaigns/${
    props.campaign.id
  }/download?x-access-token=${authService.authHeader()?.['x-access-token']}`;

  return (
    <Tile
      classes={{
        title: styles.title,
        link: styles.link
      }}
      desc={description}
      enlargeLinkOrButton
      orientation="horizontal"
      imageAlt="Document"
      imageUrl="/dsfr/artwork/pictograms/document/document.svg"
      linkProps={{
        download: true,
        href: link,
        onClick: () => {
          props.setDownloaded(true);
        }
      }}
      title="Télécharger les destinataires et vos courriers"
    />
  );
}

export default DraftDownloader;
