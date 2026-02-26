import Stack, { type StackProps } from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { Link } from 'react-router-dom';

import HousingCount from '~/components/HousingCount/HousingCount';
import type { Group } from '~/models/Group';
import styles from './group-card.module.scss';
import { styled } from '@mui/material/styles';
import { fr } from '@codegouvfr/react-dsfr';

const CardContainer = styled(Stack)<StackProps & { isActive: boolean }>(
  (props) => ({
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem',
    color: props.isActive
      ? fr.colors.decisions.text.title.blueFrance.default
      : fr.colors.decisions.text.default.grey.default,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: props.isActive
      ? fr.colors.decisions.border.actionHigh.blueFrance.default
      : fr.colors.decisions.border.default.grey.default,
    background: props.isActive
      ? fr.colors.decisions.background.contrast.info.default
      : fr.colors.decisions.background.default.grey.default,

    ':hover': {
      background: fr.colors.decisions.background.default.grey.hover
    },

    ':active': {
      background: fr.colors.decisions.background.default.grey.active
    }
  })
);

export interface GroupCardProps {
  group: Group;
  isActive: boolean;
  className?: string;
}

function GroupCard(props: Readonly<GroupCardProps>) {
  const title = `Groupe de logements - ${props.group.title} - nombre de logements : ${props.group.housingCount}, nombre de propriétaires : ${props.group.ownerCount}`;

  const isNewCampaigns = useFeatureFlagEnabled('new-campaigns');

  if (isNewCampaigns === undefined) {
    return null;
  }

  if (isNewCampaigns) {
    return (
      <Link
        className={props.className}
        to={`/groupes/${props.group.id}`}
        title={title}
        aria-label={title}
      >
        <CardContainer
          component="article"
          direction="row"
          spacing="0.5rem"
          useFlexGap
          isActive={props.isActive}
        >
          <Typography className={styles.title} component="h3" variant="body2">
            {props.group.title}
          </Typography>
          <HousingCount
            housingCount={props.group.housingCount}
            ownerCount={props.group.ownerCount}
            isActive={props.isActive}
          />
        </CardContainer>
      </Link>
    );
  }

  return (
    <Link
      className={props.className}
      to={`/groupes/${props.group.id}`}
      title={title}
      aria-label={title}
    >
      <Stack
        component="article"
        direction="row"
        className={classNames(styles.container, {
          [styles.active]: props.isActive
        })}
      >
        <Typography
          className={styles.title}
          component="h3"
          mr={1}
          variant="body2"
        >
          {props.group.title}
        </Typography>
        <HousingCount
          housingCount={props.group.housingCount}
          ownerCount={props.group.ownerCount}
        />
      </Stack>
    </Link>
  );
}

export default GroupCard;
