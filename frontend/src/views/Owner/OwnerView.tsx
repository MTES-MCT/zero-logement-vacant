import { fr } from '@codegouvfr/react-dsfr';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import MainContainer from '../../components/MainContainer/MainContainer';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerHousingCard from '../../components/OwnerHousingCard/OwnerHousingCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useOwner } from '../../hooks/useOwner';

import styles from './owner.module.scss';

function OwnerView() {
  const { count, owner, housings, findHousingsQuery } = useOwner({
    include: ['housings']
  });
  useDocumentTitle(
    owner ? `Fiche propriétaire - ${owner.fullName}` : 'Page non trouvée'
  );

  const [ownerEditionModalKey, setOwnerEditionModalKey] = useState(
    new Date().getTime()
  );

  return (
    <MainContainer grey>
      <Grid container columnSpacing={3} alignItems="flex-start">
        <Grid size={4}>
          {!owner ? (
            <Skeleton
              animation="wave"
              variant="rectangular"
              width="100%"
              height="40rem"
            />
          ) : (
            <OwnerCard
              owner={owner}
              housingCount={count?.housing}
              modify={
                <OwnerEditionModal
                  owner={owner}
                  key={ownerEditionModalKey}
                  onCancel={() => setOwnerEditionModalKey(new Date().getTime())}
                />
              }
            />
          )}
        </Grid>

        <Grid container spacing={2} size={8}>
          <Grid component="header" size={12}>
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
                <Tag className={styles.tag}>{count?.housing}</Tag>
              </Typography>
            </Grid>
          </Grid>
          {findHousingsQuery.isLoading && (
            <Skeleton
              animation="wave"
              variant="rectangular"
              width="100%"
              height="20rem"
            />
          )}
          {housings?.entities.map((housing) => (
            <Grid component="article" key={`col-${housing.id}`} size={6}>
              <OwnerHousingCard housing={housing} />
            </Grid>
          ))}
        </Grid>
      </Grid>
    </MainContainer>
  );
}

export default OwnerView;
