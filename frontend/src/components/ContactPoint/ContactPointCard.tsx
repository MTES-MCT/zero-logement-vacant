import {
  Card,
  CardDescription,
  CardTitle,
  Col,
  Icon,
  Link,
  Row,
  Tag,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import { ContactPoint } from '../../../../shared/models/ContactPoint';
import React from 'react';
import ButtonLink from '../ButtonLink/ButtonLink';
import { mailto, pluralize } from '../../utils/stringUtils';
import { useLocalityList } from '../../hooks/useLocalityList';
import _ from 'lodash';

interface Props {
  contactPoint: ContactPoint;
  onEdit?: (contactPoint: ContactPoint) => void;
  onRemove?: (contactPoint: ContactPoint) => void;
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
    <Card hasArrow={false} className="h-fit-content">
      <CardTitle as="h2">
        {!isPublicDisplay && (
          <Row>
            <Col>
              <span className="card-title-icon">
                <Icon name="ri-contacts-fill" iconPosition="center" size="1x" />
              </span>
            </Col>
            <Col className="align-right">
              {onEdit && (
                <ButtonLink
                  onClick={() => onEdit(contactPoint)}
                  isSimple
                  icon="ri-edit-2-fill"
                  iconSize="lg"
                  className="d-inline-block fr-mr-1w"
                />
              )}
              {onRemove && (
                <ButtonLink
                  onClick={() => onRemove(contactPoint)}
                  isSimple
                  icon="ri-delete-bin-5-fill"
                  iconSize="lg"
                  className="d-inline-block"
                />
              )}
            </Col>
          </Row>
        )}
        <Title as="h2" look="h6" spacing="mb-1w">
          {contactPoint.title}
        </Title>
      </CardTitle>
      <CardDescription as="div">
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
                <>
                  <Tag>Toutes les communes du territoire</Tag>
                </>
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
            <Link className="mailto" isSimple href={mailto(contactPoint.email)}>
              {contactPoint.email}
            </Link>
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
      </CardDescription>
    </Card>
  );
}

export default ContactPointCard;
