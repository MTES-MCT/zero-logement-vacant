import React, { useMemo, useState } from 'react';
import { Button, Col, Row, Text, Title, Toggle } from '@dataesr/react-dsfr';
import {
  ContactPoint,
  DraftContactPoint,
} from '../../../../shared/models/ContactPoint';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import Alert from '../../components/Alert/Alert';
import ContactPointEditionModal from '../../components/modals/ContactPointEditionModal/ContactPointEditionModal';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import ContactPointCard from '../../components/ContactPoint/ContactPointCard';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import Help from '../../components/Help/Help';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { useSettings } from '../../hooks/useSettings';
import {
  useCreateContactPointMutation,
  useFindContactPointsQuery,
  useRemoveContactPointMutation,
  useUpdateContactPointMutation,
} from '../../services/contact-point.service';

interface Props {
  establishmentId: string;
}

const EstablishmentContactPoints = ({ establishmentId }: Props) => {
  const { trackEvent } = useMatomo();

  const { data: contactPoints } = useFindContactPointsQuery({
    establishmentId,
    publicOnly: false,
  });

  const [
    updateContactPoint,
    {
      isSuccess: isUpdateSuccess,
      originalArgs: updateArgs,
      isError: isUpdateError,
    },
  ] = useUpdateContactPointMutation();
  const [
    createContactPoint,
    { isSuccess: isCreateSuccess, isError: isCreateError },
  ] = useCreateContactPointMutation();
  const [
    deleteContactPoint,
    { isSuccess: isDeleteSuccess, isError: isDeleteError },
  ] = useRemoveContactPointMutation();

  const { settings, togglePublishContactPoints } = useSettings();

  const [isCreatingModalOpen, setIsCreatingModalOpen] =
    useState<boolean>(false);
  const [contactPointToUpdate, setContactPointToUpdate] = useState<
    ContactPoint | undefined
  >();
  const [contactPointToRemove, setContactPointToRemove] = useState<
    ContactPoint | undefined
  >();

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
    if (isDraft) {
      createContactPoint(contactPoint).finally(() =>
        setIsCreatingModalOpen(false)
      );
    } else {
      updateContactPoint(contactPoint as ContactPoint).finally(() =>
        setContactPointToUpdate(undefined)
      );
    }
  };

  const onSubmitRemovingContactPoint = () => {
    if (contactPointToRemove) {
      trackEvent({
        category: TrackEventCategories.ContactPoints,
        action: TrackEventActions.ContactPoints.Delete,
      });
      deleteContactPoint(contactPointToRemove.id).finally(() =>
        setContactPointToRemove(undefined)
      );
    }
  };

  return (
    <>
      {isCreatingModalOpen && (
        <ContactPointEditionModal
          establishmentId={establishmentId}
          onSubmit={onSubmitEditingContactPoint}
          onClose={() => setIsCreatingModalOpen(false)}
        />
      )}
      {contactPointToUpdate && (
        <ContactPointEditionModal
          establishmentId={establishmentId}
          contactPoint={contactPointToUpdate}
          onSubmit={onSubmitEditingContactPoint}
          onClose={() => setContactPointToUpdate(undefined)}
        />
      )}
      {contactPointToRemove && (
        <ConfirmationModal
          onSubmit={onSubmitRemovingContactPoint}
          onClose={() => setContactPointToRemove(undefined)}
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
              label="Publication des informations"
              onChange={togglePublishContactPoints}
            />
          )}
          <div className="flex-1 flex-right">
            <div className="fr-mx-2w">
              <AppSearchBar onSearch={search} onKeySearch={searchAsync} />
            </div>
            <Button
              onClick={() => setIsCreatingModalOpen(true)}
              className="float-right"
            >
              Ajouter un guichet
            </Button>
          </div>
        </Col>
      </Row>
      {isCreateSuccess && (
        <Alert
          type="success"
          description="Le nouveau guichet a été ajouté avec succès ! "
          closable
          className="fr-mb-2w"
        />
      )}
      {isUpdateSuccess && (
        <Alert
          type="success"
          description={
            'Le guichet ' + updateArgs?.title + ' a été modifié avec succès !'
          }
          closable
          className="fr-mb-2w"
        />
      )}
      {isDeleteSuccess && (
        <Alert
          type="success"
          description="Le guichet a été supprimé avec succès !"
          closable
          className="fr-mb-2w"
        />
      )}
      {(isCreateError || isUpdateError || isDeleteError) && (
        <Alert
          type="error"
          description="Une erreur s'est produite, veuillez réessayer."
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
              onEdit={(contactPoint) => setContactPointToUpdate(contactPoint)}
              onRemove={(contactPoint) => setContactPointToRemove(contactPoint)}
              isPublicDisplay={false}
            />
          </Col>
        ))}
      </Row>
    </>
  );
};

export default EstablishmentContactPoints;
