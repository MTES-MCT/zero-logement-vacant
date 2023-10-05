import { Col, Icon, Row, Text, Title } from '../_dsfr/index';
import { ContactPoint, DraftContactPoint } from '../../../../shared/models/ContactPoint';
import React from 'react';
import { mailto, pluralize } from '../../utils/stringUtils';
import { useLocalityList } from '../../hooks/useLocalityList';
import _ from 'lodash';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Card from '@codegouvfr/react-dsfr/Card';
import AppLink from '../_app/AppLink/AppLink';
import ContactPointEditionModal from '../modals/ContactPointEditionModal/ContactPointEditionModal';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';

interface Props {
  contactPoint: ContactPoint;
  onEdit?: (contactPoint: DraftContactPoint | ContactPoint) => Promise<void>;
  onRemove?: (contactPointId: string) => Promise<void>;
  isPublicDisplay: boolean;
}

function ContactPointCard({
  contactPoint,
  onEdit,
  onRemove,
  isPublicDisplay,
}: Props) {
  const { localities, localitiesGeoCodes } = useLocalityList(
    contactPoint.establishmentId
  );
  return (
    <Card
      className="h-fit-content"
      titleAs="h2"
      title={
        <>
          {!isPublicDisplay && (
            <Row>
              <Col>
                <span className="card-title-icon">
                  <Icon
                    name="fr-icon-question-answer-fill"
                    iconPosition="center"
                    size="1x"
                  />
                </span>
              </Col>
              <Col className="align-right">
                {onEdit && (
                  <ContactPointEditionModal
                    establishmentId={contactPoint.establishmentId}
                    contactPoint={contactPoint}
                    onSubmit={onEdit}
                  />
                )}
                {onRemove && (
                  <ConfirmationModal
                    modalId={contactPoint.id}
                    onSubmit={() => onRemove(contactPoint.id)}
                    openingButtonProps={{
                      iconId: 'fr-icon-delete-bin-fill',
                      priority: 'tertiary no outline',
                      title: 'Supprimer',
                      className: 'd-inline-block',
                    }}
                  >
                    <Text size="md">
                      Êtes-vous sûr de vouloir supprimer ce guichet ?
                    </Text>
                  </ConfirmationModal>
                )}
              </Col>
            </Row>
          )}
          <Title as="h2" look="h6" spacing="mb-1w">
            {contactPoint.title}
          </Title>
        </>
      }
      desc={
        <div>
          <hr />
          {contactPoint.phone && (
            <div className="fr-p-1w bg-975">
              <Text size="sm" className="zlv-label">
                Téléphone
              </Text>
              <Text spacing="mb-0">{contactPoint.phone}</Text>
            </div>
          )}
          {contactPoint.opening && (
            <div className="fr-p-1w fr-mb-1w bg-975">
              <Text size="sm" className="zlv-label">
                Horaires et jours d'ouverture
              </Text>
              <Text spacing="mb-0" className="pre-wrap">
                {contactPoint.opening}
              </Text>
            </div>
          )}
          {contactPoint.address && (
            <div className="fr-mb-1w">
              <Text size="sm" className="zlv-label">
                Adresse
              </Text>
              <Text spacing="mb-0" className="pre-wrap">
                {contactPoint.address}
              </Text>
            </div>
          )}
          {!isPublicDisplay && contactPoint.geoCodes && localities?.length && (
            <div className="fr-mb-1w">
              <Text size="sm" className="zlv-label">
                {pluralize(contactPoint.geoCodes.length)('Commune')}
              </Text>
              <Text spacing="mb-0" className="pre-wrap">
                {_.isEqual(contactPoint.geoCodes, localitiesGeoCodes) ? (
                  <Tag>Toutes les communes du territoire</Tag>
                ) : (
                  <>
                    {contactPoint.geoCodes.map((geoCode) => (
                      <Tag
                        key={contactPoint.id + '_' + geoCode}
                        className="fr-mr-1w"
                      >
                        {localities?.find((_) => _.geoCode === geoCode)?.name}
                      </Tag>
                    ))}
                  </>
                )}
              </Text>
            </div>
          )}
          {contactPoint.email && (
            <div className="fr-mb-1w">
              <Text size="sm" className="zlv-label">
                Adresse mail
              </Text>
              <AppLink
                className="mailto"
                isSimple
                to={mailto(contactPoint.email)}
              >
                {contactPoint.email}
              </AppLink>
            </div>
          )}
          {contactPoint.notes && (
            <div className="fr-mb-1w">
              <Text size="sm" className="zlv-label">
                Notes
              </Text>
              <Text spacing="mb-0" className="pre-wrap">
                {contactPoint.notes}
              </Text>
            </div>
          )}
        </div>
      }
    ></Card>
  );
}

export default ContactPointCard;
