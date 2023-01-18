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
import { Locality } from '../../models/Locality';
import { useLocalityList } from '../../hooks/useLocalityList';

interface Props {
  locality: Locality;
  onEdit: (locality: Locality) => void;
}

function LocalityTaxesCard({ locality, onEdit }: Props) {
  const { hasTLV } = useLocalityList();

  return (
    <Card hasArrow={false} className="h-fit-content">
      <CardTitle as="h2">
        <Row>
          <Col>
            <span className="card-title-icon">
              <Icon name="ri-community-fill" iconPosition="center" size="1x" />
            </span>
          </Col>
          {locality.taxZone && !hasTLV(locality) && (
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
        <Tag className="fr-mb-2w">
          {locality.taxZone
            ? hasTLV(locality)
              ? 'Zone tendue'
              : 'Zone détendue'
            : 'Zonage inconnu'}
        </Tag>
        <hr />
        {locality.taxZone && (
          <>
            <Text size="sm" className="zlv-label">
              Taxe
            </Text>
            {hasTLV(locality) ? (
              <>
                <Text spacing="mb-1">TLV appliquée</Text>
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
              </>
            ) : (
              <>
                {locality.taxRate ? (
                  <>
                    <Text spacing="mb-1">THLV appliquée</Text>
                    <Text size="sm" className="zlv-label">
                      Taux après 2 ans
                    </Text>
                    <Text spacing="mb-0">{locality.taxRate}%</Text>
                  </>
                ) : (
                  <>
                    <Text spacing="mb-0">THLV non appliquée</Text>
                  </>
                )}
              </>
            )}
          </>
        )}
      </CardDescription>
    </Card>
  );
}

export default LocalityTaxesCard;
