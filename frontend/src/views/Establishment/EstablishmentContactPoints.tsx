import React, { useMemo, useState } from 'react';
import { Col, Row, Title } from '../../components/dsfr/index';
import {
  ContactPoint,
  DraftContactPoint,
} from '../../../../shared/models/ContactPoint';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import ContactPointEditionModal from '../../components/modals/ContactPointEditionModal/ContactPointEditionModal';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import ContactPointCard from '../../components/ContactPoint/ContactPointCard';
import Help from '../../components/Help/Help';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { useSettings } from '../../hooks/useSettings';
import {
  useCreateContactPointMutation,
  useFindContactPointsQuery,
  useRemoveContactPointMutation,
  useUpdateContactPointMutation,
} from '../../services/contact-point.service';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Toggle } from '../../components/dsfr';

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

  const onSubmitEditingContactPoint = async (
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
      await createContactPoint(contactPoint);
    } else {
      await updateContactPoint(contactPoint as ContactPoint);
    }
  };

  const onSubmitRemovingContactPoint = async (contactPointId: string) => {
    trackEvent({
      category: TrackEventCategories.ContactPoints,
      action: TrackEventActions.ContactPoints.Delete,
    });
    await deleteContactPoint(contactPointId);
  };

  return (
    <>
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
            <ContactPointEditionModal
              establishmentId={establishmentId}
              onSubmit={onSubmitEditingContactPoint}
            />
          </div>
        </Col>
      </Row>
      {isCreateSuccess && (
        <Alert
          severity="success"
          description="Le nouveau guichet a été ajouté avec succès ! "
          closable
          small
          className="fr-mb-2w"
        />
      )}
      {isUpdateSuccess && (
        <Alert
          severity="success"
          description={
            'Le guichet ' + updateArgs?.title + ' a été modifié avec succès !'
          }
          closable
          small
          className="fr-mb-2w"
        />
      )}
      {isDeleteSuccess && (
        <Alert
          severity="success"
          description="Le guichet a été supprimé avec succès !"
          closable
          small
          className="fr-mb-2w"
        />
      )}
      {(isCreateError || isUpdateError || isDeleteError) && (
        <Alert
          severity="error"
          description="Une erreur s'est produite, veuillez réessayer."
          closable
          small
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
              onEdit={onSubmitEditingContactPoint}
              onRemove={onSubmitRemovingContactPoint}
              isPublicDisplay={false}
            />
          </Col>
        ))}
      </Row>
    </>
  );
};

export default EstablishmentContactPoints;
