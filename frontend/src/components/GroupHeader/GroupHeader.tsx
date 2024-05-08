import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

import GroupCard from '../GroupCard/GroupCard';
import { useFindGroupsQuery } from '../../services/group.service';
import { Group } from '../../models/Group';
import search from '../../assets/images/search.svg';
import styles from './group-header.module.scss';

export const DISPLAY_GROUPS = 3;

interface Props {
  className?: string;
}

function GroupHeader(props: Props) {
  const [showAll, setShowAll] = useState(false);

  const { data: groups, isLoading: isLoadingGroups } = useFindGroupsQuery();

  const unarchivedGroups = groups?.filter((group) => !group.archivedAt);
  const filteredGroups = unarchivedGroups?.slice(
    0,
    showAll ? unarchivedGroups.length : DISPLAY_GROUPS,
  );
  const more = unarchivedGroups ? unarchivedGroups.length - DISPLAY_GROUPS : 0;

  function toggleShowAll(): void {
    setShowAll((prev) => !prev);
  }

  const params = useParams<{ id: string }>();
  function isActive(group: Group): boolean {
    return group.id === params.id;
  }

  return (
    <Grid className={props.className} component="article" container>
      <Grid component="header" mb={2}>
        <Typography variant="h6">Vos groupes de logements</Typography>
      </Grid>

      {isLoadingGroups && <Loading />}

      {!isLoadingGroups && !filteredGroups?.length && <Empty />}

      {!isLoadingGroups && filteredGroups && filteredGroups.length > 0 && (
        <Grid component="section" container justifyContent="center">
          {filteredGroups.map((group) => (
            <Grid component="article" key={group.id} mb={1} xs={12}>
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
        que vous souhaitez cibler et cliquez sur “Ajouter dans un groupe”.
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
