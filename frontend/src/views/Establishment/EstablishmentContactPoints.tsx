import React, { useEffect, useMemo, useState } from 'react';
import { Button, Col, Row, Text, Title, Toggle } from '@dataesr/react-dsfr';
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
import ContactPointCard from '../../components/ContactPoint/ContactPointCard';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import Help from '../../components/Help/Help';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { useSettings } from '../../hooks/useSettings';

enum ActionSteps {
  Init,
  InProgress,
  Done,
}

interface ContactPointActionState {
  step: ActionSteps;
  contactPoint?: ContactPoint;
}

interface Props {
  establishmentId: string;
}

const EstablishmentContactPoints = ({ establishmentId }: Props) => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();

  const { loading, contactPoints } = useAppSelector(
    (state) => state.establishment
  );
  const { settings, togglePublishContactPoints } = useSettings();

  const [editingState, setEditingState] = useState<ContactPointActionState>();
  const [removingState, setRemovingState] = useState<ContactPointActionState>();
  const [query, setQuery] = useState<string>();

  function search(query: string): void {
    setQuery(query);
  }

  async function searchAsync(query: string): Promise<void> {
    search(query);
  }

  const points = useMemo<ContactPoint[] | undefined>(
    () =>
      query
        ? contactPoints?.filter((cp) => cp.title.search(query) !== -1)
        : contactPoints,
    [query, contactPoints]
  );

  useEffect(() => {
    dispatch(fetchContactPoints(establishmentId));
  }, [dispatch, establishmentId]);

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
      dispatch(deleteContactPoint(removingState.contactPoint));
    }
  };

  return (
    <>
      {editingState?.step === ActionSteps.Init && (
        <ContactPointEditionModal
          establishmentId={establishmentId}
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
        <Col className="flex-left flex-align-center">
          <Title look="h5" as="h2" spacing="mr-2w">
            Vos guichets contacts ({contactPoints?.length})
          </Title>
          {settings && (
            <Toggle
              checked={settings.contactPoints?.public}
              label="Informations publiées"
              onChange={togglePublishContactPoints}
              className="fr-mt-0"
            />
          )}
        </Col>
        <Col className="flex-right flex-align-center">
          <div className="fr-mx-2w">
            <AppSearchBar onSearch={search} onKeySearch={searchAsync} />
          </div>
          <Button
            onClick={() => setEditingState({ step: ActionSteps.Init })}
            className="float-right"
          >
            Ajouter un guichet
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
      <Help className="fr-mb-4w">
        Renseignez vos guichets contact ici. Ce sont les points de contact qui
        seront affichés sur votre page publique.
      </Help>
      <Row gutters spacing="mb-2w">
        {points?.map((contactPoint) => (
          <Col n="4" key={contactPoint.id}>
            <ContactPointCard
              contactPoint={contactPoint}
              onEdit={(contactPoint) =>
                setEditingState({ step: ActionSteps.Init, contactPoint })
              }
              onRemove={(contactPoint) =>
                setRemovingState({ step: ActionSteps.Init, contactPoint })
              }
              isPublicDisplay={false}
            />
          </Col>
        ))}
      </Row>
    </>
  );
};

export default EstablishmentContactPoints;
