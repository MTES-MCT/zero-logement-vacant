import Tag from '@codegouvfr/react-dsfr/Tag';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import { Housing, lastUpdate } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import HousingSubStatusBadge from '../HousingStatusBadge/HousingSubStatusBadge';
import AppLink from '../_app/AppLink/AppLink';
import { Campaign } from '../../models/Campaign';
import classNames from 'classnames';
import styles from './housing-details-card.module.scss';
import LabelNext from '../Label/LabelNext';
import { useFindPrecisionsByHousingQuery } from '../../services/precision.service';

interface Props {
  housing: Housing;
  campaigns: Campaign[];
}

function HousingDetailsCardMobilisation({ housing, campaigns }: Props) {
  const { data: precisions } = useFindPrecisionsByHousingQuery({
    housingId: housing.id
  });

  if (!housing) {
    return null;
  }

  const campaignInProgress = campaigns.filter(
    (campaign) => campaign.status !== 'archived'
  );

  return (
    <HousingDetailsSubCard
      title={
        <Grid display="flex" alignItems="flex-start" flexDirection="row">
          <Typography
            component="h2"
            variant="h6"
            className={classNames(styles.title, 'd-inline-block')}
            sx={{ mr: 1 }}
          >
            Mobilisation :
          </Typography>
          <div className="d-inline-block">
            <HousingStatusBadge status={housing.status} inline />
            <HousingSubStatusBadge
              status={housing.status}
              subStatus={housing.subStatus}
              inline
            />
          </div>
        </Grid>
      }
      hasBorder
    >
      <Grid alignItems="flex-start" container xs={12} rowSpacing={2}>
        <Grid container rowSpacing={2} xs={122}>
          <Grid xs={8}>
            <LabelNext component="h3">Dernière mise à jour</LabelNext>
            <Typography>{lastUpdate(housing)}</Typography>
          </Grid>

          <Grid xs={4}>
            <LabelNext component="h3">
              Campagnes en cours ({campaignInProgress.length})
            </LabelNext>
            <Typography>
              {campaignInProgress.length === 0 ? (
                <>Aucune campagne associée</>
              ) : (
                campaignInProgress.map((campaign) => (
                  <div key={campaign.id}>
                    <AppLink
                      title={campaign?.title}
                      key={campaign?.id}
                      isSimple
                      to={`/campagnes/${campaign?.id}`}
                      iconId="fr-icon-mail-fill"
                      iconPosition="left"
                    >
                      {campaign?.title}
                    </AppLink>
                  </div>
                ))
              )}
            </Typography>
          </Grid>
        </Grid>

        <Grid xs={12}>
          <LabelNext component="h3">
            Dispositifs, points de blocage, évolutions du logement (
            {precisions?.length ?? 0})
          </LabelNext>
          <Typography>
            {(precisions?.length ?? 0) === 0 ? (
              <>Aucun dispositif indiqué</>
            ) : (
              precisions?.map((precision, index) => (
                <Tag key={'precision_' + index} className="fr-m-1w">
                  {precision.label}
                </Tag>
              ))
            )}
          </Typography>
        </Grid>
      </Grid>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCardMobilisation;
