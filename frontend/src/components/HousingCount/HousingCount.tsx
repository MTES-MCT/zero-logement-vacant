import { fr } from '@codegouvfr/react-dsfr';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useFeatureFlagEnabled } from 'posthog-js/react';

import styles from './housing-count.module.scss';
import { pluralize } from '~/utils/stringUtils';
import Icon from '~/components/ui/Icon';

export interface HousingCountProps {
  housingCount: number;
  ownerCount: number;
  suffix?: boolean;
  /**
   * Added with the feature flag 'new-campaigns'.
   * Thus, should remain optional to avoid breaking changes on the old design.
   */
  isActive?: boolean;
}

function HousingCount(props: Readonly<HousingCountProps>) {
  const housingCount = props.suffix
    ? `${props.housingCount} ${pluralize(props.housingCount)('logement')}`
    : props.housingCount;
  const ownerCount = props.suffix
    ? `${props.ownerCount} ${pluralize(props.ownerCount)('propriétaire')}`
    : props.ownerCount;

  const isNewCampaigns = useFeatureFlagEnabled('new-campaigns');

  if (isNewCampaigns === undefined) {
    return null;
  }

  if (isNewCampaigns) {
    return (
      <Stack
        direction="row"
        spacing="0.25rem"
        useFlexGap
        sx={{ alignItems: 'center' }}
      >
        <Stack
          direction="row"
          component="span"
          spacing="0.125rem"
          useFlexGap
          sx={{ alignItems: 'center' }}
        >
          <Icon name="ri-home-2-line" size="xs" color="inherit" />
          <Typography
            aria-label={`Nombre de logements : ${housingCount}`}
            component="span"
            variant="caption"
            sx={{
              fontSize: props.isActive ? '0.75rem' : '0.875rem',
              fontWeight: props.isActive ? 700 : 500
            }}
          >
            {housingCount}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          component="span"
          spacing="0.125rem"
          useFlexGap
          sx={{ alignItems: 'center' }}
        >
          <Icon name="ri-user-line" size="xs" color="inherit" />
          <Typography
            aria-label={`Nombre de propriétaires : ${ownerCount}`}
            component="span"
            variant="caption"
            sx={{
              fontSize: props.isActive ? '0.75rem' : '0.875rem',
              fontWeight: props.isActive ? 700 : 500
            }}
          >
            {ownerCount}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  return (
    <section className={styles.counts}>
      <span
        aria-hidden={true}
        className={fr.cx('ri-home-2-fill', 'fr-icon--sm', 'fr-mr-1v')}
        title="Logements"
      />
      <Typography
        aria-label={`Nombre de logements : ${housingCount}`}
        component="span"
        sx={{ fontSize: '0.875rem', mr: 1, mb: 0 }}
      >
        {housingCount}
      </Typography>
      <span
        aria-hidden={true}
        className={fr.cx('ri-user-fill', 'fr-icon--sm', 'fr-mr-1v')}
        title="Propriétaires"
      />
      <Typography
        aria-label={`Nombre de propriétaires : ${ownerCount}`}
        component="span"
        sx={{ fontSize: '0.875rem', mb: 0 }}
      >
        {ownerCount}
      </Typography>
    </section>
  );
}

export default HousingCount;
