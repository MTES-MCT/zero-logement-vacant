import React, { useEffect, useState } from 'react';

import { Col, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import Alert from '../../components/Alert/Alert';
import LocalityTaxEditionModal from '../../components/modals/LocalityTaxEditionModal/LocalityTaxEditionModal';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import LocalityTaxCard from '../../components/LocalityTaxCard/LocalityTaxCard';
import { Locality } from '../../models/Locality';

enum ActionSteps {
  Init,
  InProgress,
  Done,
}

interface LocalityTaxActionState {
  step: ActionSteps;
  locality?: Locality;
}

const EstablishmentLocalityTaxes = () => {
  const dispatch = useDispatch();
  const { trackEvent } = useMatomo();
  const { loading, localityTaxes } = useSelector(
    (state: ApplicationState) => state.establishment
  );
  const [editingState, setEditingState] = useState<
    LocalityTaxActionState | undefined
  >();

  useEffect(() => {
    dispatch(fetchLocalityTaxes());
  }, [dispatch]);

  useEffect(() => {
    if (editingState?.step === ActionSteps.InProgress && !loading) {
      setEditingState({
        step: ActionSteps.Done,
        localityTax: editingState.localityTax,
      });
    }
  }, [loading]); //eslint-disable-line react-hooks/exhaustive-deps

  const onSubmitEditingLocalityTax = (
    localityTax: DraftLocalityTax | LocalityTax
  ) => {
    const isDraft = !('id' in localityTax);
    trackEvent({
      category: TrackEventCategories.LocalityTaxes,
      action: isDraft
        ? TrackEventActions.LocalityTaxes.Create
        : TrackEventActions.LocalityTaxes.Update,
    });
    setEditingState({
      step: ActionSteps.InProgress,
      localityTax: isDraft ? undefined : (localityTax as LocalityTax),
    });
    dispatch(
      isDraft
        ? createLocalityTax(localityTax)
        : updateLocalityTax(localityTax as LocalityTax)
    );
  };

  return (
    <>
      {editingState?.step === ActionSteps.Init && (
        <LocalityTaxEditionModal
          localityTax={editingState.localityTax}
          onSubmit={onSubmitEditingLocalityTax}
          onClose={() => setEditingState(undefined)}
        />
      )}
      <Title look="h5" as="h2" className="fr-mt-1w">
        Taxes sur les logements vacants
      </Title>
      {editingState?.step === ActionSteps.Done && (
        <Alert
          type="success"
          description={
            editingState.localityTax
              ? 'Le guichet ' +
                editingState.localityTax?.title +
                ' a été modifié avec succès !'
              : 'Le nouveau guichet a été ajouté avec succès ! '
          }
          closable
          className="fr-mb-2w"
        />
      )}
      <Row gutters>
        {localityTaxes?.map((localityTax) => (
          <Col n="4" key={localityTax.id}>
            <LocalityTaxCard
              localityTax={localityTax}
              onEdit={(localityTax) =>
                setEditingState({ step: ActionSteps.Init, localityTax })
              }
            />
          </Col>
        ))}
      </Row>
    </>
  );
};

export default EstablishmentLocalityTaxes;
