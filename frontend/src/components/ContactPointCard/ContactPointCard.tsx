import {
  Card,
  CardDescription,
  CardTitle,
  Col,
  Icon,
  Link,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import { ContactPoint } from '../../models/ContactPoint';
import React from 'react';
import ButtonLink from '../ButtonLink/ButtonLink';
import { mailto } from '../../utils/stringUtils';
import { useLocalityList } from '../../hooks/useLocalityList';

interface Props {
  contactPoint: ContactPoint;
  onEdit: (contactPoint: ContactPoint) => void;
  onRemove: (contactPoint: ContactPoint) => void;
}

function ContactPointCard({ contactPoint, onEdit, onRemove }: Props) {
  const { localities } = useLocalityList();
  return (
    <Card hasArrow={false} className="h-fit-content">
      <CardTitle as="h2">
        <Row>
          <Col>
            <span className="card-title-icon">
              <Icon name="ri-contacts-fill" iconPosition="center" size="1x" />
            </span>
          </Col>
          <Col className="align-right">
            <ButtonLink
              onClick={() => onEdit(contactPoint)}
              isSimple
              icon="ri-edit-2-fill"
              iconSize="lg"
              className="d-inline-block fr-mr-1w"
            />
            <ButtonLink
              onClick={() => onRemove(contactPoint)}
              isSimple
              icon="ri-delete-bin-5-fill"
              iconSize="lg"
              className="d-inline-block"
            />
          </Col>
        </Row>
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
        {contactPoint.geoCode && localities?.length && (
          <div className="fr-mb-1w">
            <Text size="sm" className="zlv-label">
              Commune
            </Text>
            <Text spacing="mb-0" className="pre-wrap">
              {
                localities?.find((_) => _.geoCode === contactPoint.geoCode)
                  ?.name
              }
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
              Téléphone
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
