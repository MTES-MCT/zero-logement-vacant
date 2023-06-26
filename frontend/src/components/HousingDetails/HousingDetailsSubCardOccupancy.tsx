import { Col, Row, Tag, Text } from '@dataesr/react-dsfr';
import React from 'react';
import { Housing } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import { pluralize } from '../../utils/stringUtils';
import DPE from '../DPE/DPE';
import { useAppSelector } from '../../hooks/useStore';
import { useFeature } from '../../hooks/useFeature';

interface Props {
  housing: Housing;
}

function HousingDetailsCardOccupancy({ housing }: Props) {
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );
  const features = useFeature({
    establishmentId: establishment?.id,
  });
  return (
    <HousingDetailsSubCard title="Occupation" hasBorder>
      <Row>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            Dans cette situation depuis
          </Text>
        </Col>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            {pluralize(housing.dataYears.length)('Millésime fichier')} LOVAC
          </Text>
          <Text spacing="mb-1w">{housing.dataYears.join(', ')}</Text>
        </Col>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            Logement passoire énergétique
          </Text>
        </Col>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            Ancien statut d’occupation
          </Text>
        </Col>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            Taxe sur la vacance
            <Tag className="d-block">{housing.taxed ? 'Oui' : 'Non'}</Tag>
          </Text>
        </Col>
        {features.isEnabled('occupancy') && (
          <Col n="4">
            <div className="fr-mb-3w">
              <Text size="sm" className="zlv-label">
                Étiquette DPE (majoritaire)
              </Text>
              {housing.energyConsumption ? (
                <DPE value={housing.energyConsumption} />
              ) : (
                <Text spacing="mb-1w">Non fournie</Text>
              )}
            </div>
          </Col>
        )}
      </Row>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCardOccupancy;
