import React, { useEffect, useState } from 'react';

import { Button, Col, Row, Text, Title } from '@dataesr/react-dsfr';
import {
  ContactPoint,
  DraftContactPoint,
} from '../../../../shared/models/ContactPoint';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import Alert from '../../components/Alert/Alert';
import {
  createContactPoint,
  deleteContactPoint,
  fetchContactPoints,
  updateContactPoint,
} from '../../store/actions/establishmentAction';
import ContactPointEditionModal from '../../components/modals/ContactPointEditionModal/ContactPointEditionModal';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import ContactPointCard from '../../components/ContactPointCard/ContactPointCard';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';

enum ActionSteps {
  Init,
  InProgress,
  Done,
}

interface ContactPointActionState {
  step: ActionSteps;
  contactPoint?: ContactPoint;
}

const EstablishmentContactPoints = () => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { loading, contactPoints } = useAppSelector(
    (state) => state.establishment
  );
  const [editingState, setEditingState] = useState<ContactPointActionState>();
  const [removingState, setRemovingState] = useState<ContactPointActionState>();

  useEffect(() => {
    dispatch(fetchContactPoints());
  }, [dispatch]);

  useEffect(() => {
    if (editingState?.step === ActionSteps.InProgress && !loading) {
      setEditingState({
        step: ActionSteps.Done,
        contactPoint: editingState.contactPoint,
      });
    }
    if (removingState?.step === ActionSteps.InProgress && !loading) {
      setRemovingState({
        step: ActionSteps.Done,
        contactPoint: removingState.contactPoint,
      });
    }
  }, [loading]); //eslint-disable-line react-hooks/exhaustive-deps

  const onSubmitEditingContactPoint = (
    contactPoint: DraftContactPoint | ContactPoint
  ) => {
    const isDraft = !('id' in contactPoint);
    trackEvent({
      category: TrackEventCategories.ContactPoints,
      action: isDraft
        ? TrackEventActions.ContactPoints.Create
        : TrackEventActions.ContactPoints.Update,
    });
    setEditingState({
      step: ActionSteps.InProgress,
      contactPoint: isDraft ? undefined : (contactPoint as ContactPoint),
    });
    dispatch(
      isDraft
        ? createContactPoint(contactPoint)
        : updateContactPoint(contactPoint as ContactPoint)
    );
  };

  const onSubmitRemovingContactPoint = () => {
    if (removingState?.contactPoint) {
      trackEvent({
        category: TrackEventCategories.ContactPoints,
        action: TrackEventActions.ContactPoints.Delete,
      });
      setRemovingState({
        step: ActionSteps.InProgress,
        contactPoint: removingState.contactPoint,
      });
      dispatch(deleteContactPoint(removingState.contactPoint.id));
    }
  };

  return (
    <>
      {editingState?.step === ActionSteps.Init && (
        <ContactPointEditionModal
          contactPoint={editingState.contactPoint}
          onSubmit={onSubmitEditingContactPoint}
          onClose={() => setEditingState(undefined)}
        />
      )}
      {removingState?.step === ActionSteps.Init && (
        <ConfirmationModal
          onSubmit={onSubmitRemovingContactPoint}
          onClose={() => setRemovingState(undefined)}
        >
          <Text size="md">Êtes-vous sûr de vouloir supprimer ce guichet ?</Text>
        </ConfirmationModal>
      )}
      <Row>
        <Col>
          <Title look="h5" as="h2" className="fr-mt-1w">
            Vos guichets contacts ({contactPoints?.length})
          </Title>
        </Col>
        <Col>
          <Button
            onClick={() => setEditingState({ step: ActionSteps.Init })}
            className="float-right"
          >
            Ajouter un guichet contact
          </Button>
        </Col>
      </Row>
      {editingState?.step === ActionSteps.Done && (
        <Alert
          type="success"
          description={
            editingState.contactPoint
              ? 'Le guichet ' +
                editingState.contactPoint?.title +
                ' a été modifié avec succès !'
              : 'Le nouveau guichet a été ajouté avec succès ! '
          }
          closable
          className="fr-mb-2w"
        />
      )}
      {removingState?.step === ActionSteps.Done && (
        <Alert
          type="success"
          description="Le guichet a été supprimé avec succès !"
          closable
          className="fr-mb-2w"
        />
      )}
      <Row gutters>
        {contactPoints?.map((contactPoint) => (
          <Col n="4" key={contactPoint.id}>
            <ContactPointCard
              contactPoint={contactPoint}
              onEdit={(contactPoint) =>
                setEditingState({ step: ActionSteps.Init, contactPoint })
              }
              onRemove={(contactPoint) =>
                setRemovingState({ step: ActionSteps.Init, contactPoint })
              }
            />
          </Col>
        ))}
      </Row>
    </>
  );
};

export default EstablishmentContactPoints;
