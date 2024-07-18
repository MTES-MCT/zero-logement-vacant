import { fr } from '@codegouvfr/react-dsfr';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';

import { Campaign } from '../../models/Campaign';
import { useGetGroupQuery } from '../../services/group.service';
import AppLink from '../_app/AppLink/AppLink';

interface Props {
  campaign: Campaign;
}

function CampaignCreatedFromGroup(props: Props) {
  const { data: group, } = useGetGroupQuery(
    props.campaign?.groupId ?? skipToken
  );

  if (!group) {
    return false;
  }

  return (
    <>
      <Typography component="span" variant="subtitle2" mr={2}>
        Créée à partir du groupe
      </Typography>
      {group.archivedAt ? (
        <>
          <span className={fr.cx('ri-hotel-fill', 'fr-icon--sm', 'fr-mr-1w')} />
          <Typography component="span">{group.title}</Typography>
        </>
      ) : (
        <AppLink
          to={`/groupes/${group.id}`}
          iconId="ri-hotel-fill"
          iconPosition="left"
          isSimple
        >
          {group.title}
        </AppLink>
      )}
    </>
  );
}

export default CampaignCreatedFromGroup;
