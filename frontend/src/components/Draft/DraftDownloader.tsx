import Tile from '@codegouvfr/react-dsfr/Tile';

import styles from './draft-downloader.module.scss';
import { Campaign } from '../../models/Campaign';
import config from '../../utils/config';
import authService from '../../services/auth.service';

interface Props {
  campaign: Campaign;
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
