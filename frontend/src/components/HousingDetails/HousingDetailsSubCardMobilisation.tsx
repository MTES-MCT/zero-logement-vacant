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
import { OptionTreeSeparator } from '../../models/HousingFilters';
import LabelNext from '../Label/LabelNext';

interface Props {
  housing: Housing;
  campaigns: Campaign[];
}

function HousingDetailsCardMobilisation({ housing, campaigns }: Props) {
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
      <Grid alignItems="flex-start" container xs>
        <Grid container rowSpacing={2} xs={8}>
          <Grid xs={6}>
            <LabelNext component="h3">Dernière mise à jour</LabelNext>
            <Typography>{lastUpdate(housing)}</Typography>
          </Grid>
          <Grid xs={6}>
            <LabelNext component="h3">Prise de contact</LabelNext>
            <Typography>
              {campaigns.length === 0
                ? 'Jamais contacté'
                : `Contacté ${campaigns.length} fois`}
            </Typography>
          </Grid>
          <Grid xs={6}>
            <LabelNext>
              Dispositifs ({housing.precisions?.length ?? 0})
            </LabelNext>
            <Typography>
              {(housing.precisions?.length ?? 0) === 0 ? (
                <>Aucun dispositif indiqué</>
              ) : (
                housing.precisions?.map((precision, index) => (
                  <Tag key={'precision_' + index} className="d-block fr-mb-1w">
                    {precision.startsWith('Dispositif')
                      ? precision.split(OptionTreeSeparator).reverse()[0]
                      : precision
                          .split(OptionTreeSeparator)
                          .splice(1)
                          .join(OptionTreeSeparator)}
                  </Tag>
                ))
              )}
            </Typography>
          </Grid>
          <Grid xs={6}>
            <LabelNext>
              Points de blocage ({housing.vacancyReasons?.length ?? 0})
            </LabelNext>
            <Typography>
              {(housing.vacancyReasons?.length ?? 0) === 0 ? (
                <>Aucun blocage indiqué</>
              ) : (
                housing.vacancyReasons?.map((vacancyReason, index) => (
                  <Tag
                    key={'vacancyReason_' + index}
                    className="d-block fr-mb-1w"
                  >
                    {vacancyReason.split(OptionTreeSeparator).reverse()[0]}
                  </Tag>
                ))
              )}
            </Typography>
          </Grid>
        </Grid>
        <Grid xs={4}>
          <LabelNext>
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
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCardMobilisation;
