import { Col, Icon, Row, Text, Title } from '../../components/dsfr/index';
import React from 'react';
import AppLinkAsButton from '../AppLinkAsButton/AppLinkAsButton';
import { Locality, TaxKinds, TaxKindsLabels } from '../../models/Locality';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Card from '@codegouvfr/react-dsfr/Card';

interface Props {
  locality: Locality;
  onEdit?: (locality: Locality) => void;
  isPublicDisplay: boolean;
}

function LocalityTaxesCard({ locality, onEdit, isPublicDisplay }: Props) {
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
                    name="fr-icon-community-fill"
                    iconPosition="center"
                    size="1x"
                  />
                </span>
              </Col>
              {locality.taxKind !== TaxKinds.TLV && onEdit && (
                <Col className="align-right">
                  <AppLinkAsButton
                    onClick={() => onEdit(locality)}
                    isSimple
                    iconId="fr-icon-edit-fill"
                    className="d-inline-block fr-mr-1w"
                  />
                </Col>
              )}
            </Row>
          )}
          <Title as="h2" look="h6" spacing="mb-0">
            {locality.name}
          </Title>
        </>
      }
      desc={
        <div>
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
          {locality.taxKind === TaxKinds.THLV && locality.taxRate && (
            <>
              <Text size="sm" className="zlv-label">
                Taux après 2 ans
              </Text>
              <Text spacing="mb-0">{locality.taxRate}%</Text>
            </>
          )}
        </div>
      }
    ></Card>
  );
}

export default LocalityTaxesCard;
