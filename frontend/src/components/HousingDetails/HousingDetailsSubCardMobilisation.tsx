import { Col, Row, Text } from '@dataesr/react-dsfr';
import React from 'react';
import { Housing } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import HousingSubStatusBadge from '../HousingStatusBadge/HousingSubStatusBadge';
import InternalLink from '../InternalLink/InternalLink';
import {
  Campaign,
  campaignBundleIdUrlFragment,
  campaignFullName,
} from '../../models/Campaign';
import { differenceInDays, format } from 'date-fns';

interface Props {
  housing: Housing;
  campaigns: Campaign[];
}

function HousingDetailsCardMobilisation({ housing, campaigns }: Props) {
  if (!housing) {
    return <></>;
  }

  return (
    <HousingDetailsSubCard
      title={
        <>
          Mobilisation
          <div className="fr-ml-2w">
            <HousingStatusBadge status={housing.status} />
            <HousingSubStatusBadge
              status={housing.status}
              subStatus={housing.subStatus}
            />
          </div>
        </>
      }
      hasBorder
    >
      <Row>
        <Col n="8">
          <Row>
            <Col n="6">
              <Text size="sm" className="zlv-label">
                Dernière mise à jour
              </Text>
              {housing.lastContact && (
                <Text spacing="mb-1w">
                  {format(housing.lastContact, 'dd/MM/yyyy')} (
                  {differenceInDays(new Date(), housing.lastContact)} jours)
                </Text>
              )}
            </Col>
            <Col n="6">
              <Text size="sm" className="zlv-label">
                Prise de contact
              </Text>
            </Col>
            <Col n="6">
              <Text size="sm" className="zlv-label">
                Précisions ({housing.precisions?.length ?? 0})
              </Text>
            </Col>
          </Row>
        </Col>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            Campagnes en cours ({campaigns.length})
          </Text>
          {campaigns.map((campaign) => (
            <div>
              <InternalLink
                title={campaign?.name}
                key={campaign?.id}
                isSimple
                to={
                  '/campagnes/' +
                  campaignBundleIdUrlFragment({
                    campaignNumber: campaign.campaignNumber,
                    reminderNumber: campaign.reminderNumber,
                  })
                }
                icon="ri-mail-fill"
                iconPosition="left"
              >
                {campaignFullName(campaign)}
              </InternalLink>
            </div>
          ))}
        </Col>
      </Row>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCardMobilisation;
