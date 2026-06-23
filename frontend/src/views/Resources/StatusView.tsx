import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Grid from '@mui/material/Grid';
import classNames from 'classnames';

import MainContainer from '../../components/MainContainer/MainContainer';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { HousingStates } from '../../models/HousingState';

const StatusView = () => {
  useDocumentTitle('Liste des statuts de suivi');

  return (
    <MainContainer title="Liste des statuts de suivi">
      <Alert
        description="Afin de vous aider dans la mise à jour des dossiers, vous trouverez ci-dessous l'ensemble des statuts de suivi que vous pouvez appliquer aux dossiers dans la solution ZLV. En face des statuts, vous trouverez les sous-statuts correspondants."
        severity="info"
        small
        className="fr-mb-3w"
      />
      <Grid container className="fr-py-1w bordered-b bg-100">
        <Grid size={4}>
          <b>Statuts</b>
        </Grid>
        <Grid size={4}>
          <b>Sous statuts</b>
        </Grid>
      </Grid>
      {HousingStates.map((state, stateIndex) => (
        <Grid
          container
          className={classNames('fr-py-1w', {
            'bordered-b': stateIndex !== HousingStates.length - 1
          })}
          key={state + '_' + stateIndex}
        >
          <Grid size={4}>
            <b>{state.title}</b>
          </Grid>
          <Grid size="grow">
            {state.subStatusList?.map((subStatus, subStatusIndex) => (
              <Grid
                container
                className={classNames('fr-py-1w', {
                  'bordered-b':
                    subStatusIndex + 1 !== state.subStatusList?.length
                })}
                key={state + '_' + subStatus + '_' + subStatusIndex}
              >
                <Grid size="grow">{subStatus.title}</Grid>
              </Grid>
            ))}
          </Grid>
        </Grid>
      ))}
    </MainContainer>
  );
};

export default StatusView;
