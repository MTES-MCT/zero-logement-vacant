import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import React, { useState } from 'react';

import GroupCard from '../GroupCard/GroupCard';
import { useFindGroupsQuery } from '../../services/group.service';
import { Group } from '../../models/Group';
import { useParams } from 'react-router-dom';

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

  return (
    <Grid className={props.className} component="article" container>
      <Grid component="header" mb={2}>
        <Typography variant="h6">Vos groupes de logements</Typography>
      </Grid>

      {isLoadingGroups ? null : (
        <Grid component="section" container justifyContent="center">
          {filteredGroups?.map((group) => (
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

export default GroupHeader;
