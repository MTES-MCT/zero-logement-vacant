import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { match, Pattern } from 'ts-pattern';

import search from '~/assets/images/search.svg';
import GroupCard from '~/components/GroupCard/GroupCard';
import type { Group } from '~/models/Group';
import { useFindGroupsQuery } from '~/services/group.service';
import styles from './group-header.module.scss';

export const DISPLAY_GROUPS = 3;

const FullWidthGroupCard = styled(GroupCard)({
  width: '100%'
});

export interface GroupHeaderProps {
  className?: string;
}

function GroupHeader(props: Readonly<GroupHeaderProps>) {
  const [showAll, setShowAll] = useState(false);

  const { data: groups, isLoading, isSuccess } = useFindGroupsQuery();

  const unarchivedGroups = groups?.filter((group) => !group.archivedAt);
  const filteredGroups = unarchivedGroups?.slice(
    0,
    showAll ? unarchivedGroups.length : DISPLAY_GROUPS
  );
  const more = unarchivedGroups ? unarchivedGroups.length - DISPLAY_GROUPS : 0;

  function toggleShowAll(): void {
    setShowAll((prev) => !prev);
  }

  const params = useParams<{ id: string }>();
  function isActive(group: Group): boolean {
    return group.id === params.id;
  }

  const isNewCampaigns = useFeatureFlagEnabled('new-campaigns');

  if (isNewCampaigns === undefined) {
    return null;
  }

  if (isNewCampaigns) {
    return (
      <Stack
        className={props.className}
        component="article"
        spacing="0.75rem"
        useFlexGap
      >
        <Typography component="h2" variant="h6">
          Vos groupes de logements
        </Typography>

        {match({ filteredGroups, isLoading, isSuccess })
          .with({ isLoading: true }, () => <Loading />)
          .with({ isSuccess: true, filteredGroups: [] }, () => <Empty />)
          .with(
            { isSuccess: true, filteredGroups: Pattern.array().select() },
            (groups) => (
              <Stack
                component="section"
                spacing="0.5rem"
                useFlexGap
                sx={{ alignItems: 'center' }}
              >
                {groups.map((group) => (
                  <FullWidthGroupCard
                    key={group.id}
                    group={group}
                    isActive={isActive(group)}
                  />
                ))}

                {more > 0 ? (
                  <Button
                    priority="tertiary"
                    size="small"
                    onClick={toggleShowAll}
                  >
                    {showAll ? 'Voir moins' : `Voir plus (${more})`}
                  </Button>
                ) : null}
              </Stack>
            )
          )
          .otherwise(() => null)}
      </Stack>
    );
  }

  return (
    <Grid className={props.className} component="article" container>
      <Grid component="header" mb={2}>
        <Typography component="h2" variant="h6">
          Vos groupes de logements
        </Typography>
      </Grid>
      {isLoading && <Loading />}
      {!isLoading && !filteredGroups?.length && <Empty />}
      {!isLoading && filteredGroups && filteredGroups.length > 0 && (
        <Grid component="section" container justifyContent="center" size={12}>
          {filteredGroups.map((group) => (
            <Grid component="article" key={group.id} mb={1} size={12}>
              <GroupCard group={group} isActive={isActive(group)} />
            </Grid>
          ))}

          {more > 0 && (
            <Grid component="footer">
              <Button priority="tertiary" onClick={toggleShowAll}>
                {showAll ? 'Afficher moins' : `Afficher plus (${more})`}
              </Button>
            </Grid>
          )}
        </Grid>
      )}
    </Grid>
  );
}

function Empty() {
  return (
    <Stack className={styles.stack} component="section">
      <img
        alt="Rechercher..."
        className={fr.cx('fr-responsive-img--1x1')}
        height={100}
        width={100}
        src={search}
      />
      <Typography mb={1} sx={{ fontWeight: 700 }} variant="body2">
        Créez un premier groupe pour faire un export et préparer une campagne !
      </Typography>
      <Typography mb={1} variant="caption">
        Pour pouvoir exporter une liste de logements, sélectionnez les logements
        que vous souhaitez cibler et cliquez sur “Exporter ou contacter”.
      </Typography>
    </Stack>
  );
}

function Loading() {
  return (
    <Stack spacing={1} width="100%">
      <Skeleton
        animation="wave"
        height={58}
        variant="rectangular"
        width="100%"
      />
      <Skeleton
        animation="wave"
        height={58}
        variant="rectangular"
        width="100%"
      />
      <Skeleton
        animation="wave"
        height={58}
        variant="rectangular"
        width="100%"
      />
    </Stack>
  );
}

export default GroupHeader;
