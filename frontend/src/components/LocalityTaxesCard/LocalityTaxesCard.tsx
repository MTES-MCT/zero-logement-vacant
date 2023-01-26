import {
  Card,
  CardDescription,
  CardTitle,
  Col,
  Icon,
  Row,
  Tag,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import React from 'react';
import ButtonLink from '../ButtonLink/ButtonLink';
import { Locality, TaxKinds, TaxKindsLabels } from '../../models/Locality';

interface Props {
  locality: Locality;
  onEdit: (locality: Locality) => void;
}

function LocalityTaxesCard({ locality, onEdit }: Props) {
  return (
    <Card hasArrow={false} className="h-fit-content">
      <CardTitle as="h2">
        <Row>
          <Col>
            <span className="card-title-icon">
              <Icon name="ri-community-fill" iconPosition="center" size="1x" />
            </span>
          </Col>
          {locality.taxKind !== TaxKinds.TLV && (
            <Col className="align-right">
              <ButtonLink
                onClick={() => onEdit(locality)}
                isSimple
                icon="ri-edit-2-fill"
                iconSize="lg"
                className="d-inline-block fr-mr-1w"
              />
            </Col>
          )}
        </Row>
        <Title as="h2" look="h6" spacing="mb-0">
          {locality.name}
        </Title>
      </CardTitle>
      <CardDescription as="div">
        <Tag className="fr-mb-2w">{TaxKindsLabels[locality.taxKind]}</Tag>
        <hr className="fr-pb-1w" />
        {locality.taxKind === TaxKinds.TLV && (
          <Row>
            <Col>
              <Text size="sm" className="zlv-label">
                Taux 1ère année
              </Text>
              <Text spacing="mb-0">17%</Text>
            </Col>
            <Col>
              <Text size="sm" className="zlv-label">
                Taux années suivantes
              </Text>
              <Text spacing="mb-0">34%</Text>
            </Col>
          </Row>
        )}
        {locality.taxKind === TaxKinds.THLV && (
          <>
            <Text size="sm" className="zlv-label">
              Taux après 2 ans
            </Text>
            <Text spacing="mb-0">{locality.taxRate}%</Text>
          </>
        )}
      </CardDescription>
    </Card>
  );
}

export default LocalityTaxesCard;
