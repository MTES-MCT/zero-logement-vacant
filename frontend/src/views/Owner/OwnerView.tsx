import Tag from '@codegouvfr/react-dsfr/Tag';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { useState } from 'react';

import styles from './owner.module.scss';
import { useOwner } from '../../hooks/useOwner';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerHousingCard from '../../components/OwnerHousingCard/OwnerHousingCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import MainContainer from '../../components/MainContainer/MainContainer';
import { fr } from '@codegouvfr/react-dsfr';

function OwnerView() {
  const { count, owner, paginatedHousing } = useOwner({
    include: ['housings']
  });
  useDocumentTitle(
    owner ? `Fiche propriétaire - ${owner.fullName}` : 'Page non trouvée'
  );
  const housingCount = count?.housing ?? 0;

  const [ownerEditionModalKey, setOwnerEditionModalKey] = useState(
    new Date().getTime()
  );

  if (!owner || !paginatedHousing) {
    return <Loading />;
  }

  return (
    <MainContainer grey>
      <Grid container columnSpacing={3} alignItems="flex-start">
        <Grid xs={4}>
          <OwnerCard
            owner={owner}
            housingCount={housingCount}
            modify={
              <OwnerEditionModal
                owner={owner}
                key={ownerEditionModalKey}
                onCancel={() => setOwnerEditionModalKey(new Date().getTime())}
              />
            }
          />
        </Grid>

        <Grid container xs={8} spacing={2}>
          <Grid component="header" xs={12}>
            <Grid
              component="section"
              sx={{
                backgroundColor:
                  fr.colors.decisions.background.default.grey.default,
                padding: fr.spacing('2w')
              }}
            >
              <Typography component="h3" variant="h6" mb={0}>
                <span className="fr-mr-1w">Tous les logements</span>
                <Tag className={styles.tag}>{housingCount}</Tag>
              </Typography>
            </Grid>
          </Grid>
          {paginatedHousing.entities.map((housing) => (
            <Grid component="article" xs={6} key={`col-${housing.id}`}>
              <OwnerHousingCard housing={housing} />
            </Grid>
          ))}
        </Grid>
      </Grid>
    </MainContainer>
  );
}

function Loading() {
  return null;
}

export default OwnerView;
