import {
  Card,
  CardDescription,
  CardTitle,
  Col,
  Icon,
  Link,
  Row,
  Tag,
  Title,
} from '@dataesr/react-dsfr';
import React from 'react';
import ButtonLink from '../ButtonLink/ButtonLink';
import { GeoPerimeter } from '../../models/GeoPerimeter';

interface Props {
  geoPerimeter: GeoPerimeter;
  onEdit: (geoPerimeter: GeoPerimeter) => void;
  onRemove: (geoPerimeter: GeoPerimeter) => void;
}

function GeoPerimeterCard({ geoPerimeter, onEdit, onRemove }: Props) {
  return (
    <Card hasArrow={false} className="h-fit-content">
      <CardTitle as="h2">
        <Row>
          <Col>
            <span className="card-title-icon">
              <Icon name="ri-map-fill" iconPosition="center" size="1x" />
            </span>
          </Col>
          <Col className="align-right">
            <ButtonLink
              onClick={() => onEdit(geoPerimeter)}
              isSimple
              icon="ri-edit-2-fill"
              iconSize="lg"
              className="d-inline-block fr-mr-1w"
            />
            <ButtonLink
              onClick={() => onRemove(geoPerimeter)}
              isSimple
              icon="ri-delete-bin-5-fill"
              iconSize="lg"
              className="d-inline-block fr-mr-1w"
            />
          </Col>
        </Row>
        <Title as="h2" look="h6" spacing="mb-0">
          {geoPerimeter.name}
        </Title>
      </CardTitle>
      <CardDescription as="div">
        <Tag className="fr-mb-4w">
          {geoPerimeter.kind ? geoPerimeter.kind : 'Non renseigné'}
        </Tag>
        <Row justifyContent="right">
          <Link
            title="Afficher (.json)"
            target="_blank"
            isSimple
            display="inline"
            icon="ri-eye-fill"
            iconPosition="left"
            className="fr-mt-4w"
            href={
              'https://geojson.io/#data=data:application/json,' +
              encodeURIComponent(JSON.stringify(geoPerimeter.geoJson))
            }
          >
            Afficher (.json)
          </Link>
        </Row>
      </CardDescription>
    </Card>
  );
}

export default GeoPerimeterCard;
