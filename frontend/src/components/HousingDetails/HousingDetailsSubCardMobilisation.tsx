import { Col, Row, Tag, Text, Title } from '@dataesr/react-dsfr';
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
import classNames from 'classnames';
import styles from './housing-details-card.module.scss';
import { OptionTreeSeparator } from '../../models/HousingFilters';

interface Props {
  housing: Housing;
  campaigns: Campaign[];
}

function HousingDetailsCardMobilisation({ housing, campaigns }: Props) {
  if (!housing) {
    return <></>;
  }

  const campaignInProgress = campaigns.filter((_) => !_?.archivedAt);

  return (
    <HousingDetailsSubCard
      title={
        <>
          <Title
            as="h2"
            look="h6"
            spacing="mb-1w"
            className={classNames(styles.title, 'd-inline-block')}
          >
            Mobilisation :
          </Title>
          <div className="fr-ml-1w d-inline-block">
            <HousingStatusBadge status={housing.status} inline />
            <HousingSubStatusBadge
              status={housing.status}
              subStatus={housing.subStatus}
              inline
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
              <Text spacing="mb-1w">
                {housing.lastContact
                  ? `${format(
                      housing.lastContact,
                      'dd/MM/yyyy'
                    )} (${differenceInDays(
                      new Date(),
                      housing.lastContact
                    )} jours)`
                  : 'Aucune mise à jour'}
              </Text>
            </Col>
            <Col n="6">
              <Text size="sm" className="zlv-label">
                Prise de contact
              </Text>
              <Text spacing="mb-1w">
                {campaigns.length === 0
                  ? 'Jamais contacté'
                  : `Contacté ${campaigns.length} fois`}
              </Text>
            </Col>
            <Col n="6">
              <Text size="sm" className="zlv-label">
                Dispositifs ({housing.precisions?.length ?? 0})
              </Text>
              <Text spacing="mb-1w">
                {(housing.precisions?.length ?? 0) === 0 ? (
                  <>Aucune dispositif associé</>
                ) : (
                  housing.precisions?.map((precision, index) => (
                    <Tag
                      key={'precision_' + index}
                      className="d-block fr-mb-1w"
                    >
                      {precision.startsWith('Dispositif')
                        ? precision.split(OptionTreeSeparator).reverse()[0]
                        : precision
                            .split(OptionTreeSeparator)
                            .splice(1)
                            .join(OptionTreeSeparator)}
                    </Tag>
                  ))
                )}
              </Text>
            </Col>
            <Col n="6">
              <Text size="sm" className="zlv-label">
                Points de blocage ({housing.vacancyReasons?.length ?? 0})
              </Text>
              <Text spacing="mb-1w">
                {(housing.vacancyReasons?.length ?? 0) === 0 ? (
                  <>Aucune</>
                ) : (
                  housing.vacancyReasons?.map((vacancyReason, index) => (
                    <Tag
                      key={'vacancyReason_' + index}
                      className="d-block fr-mb-1w"
                    >
                      {vacancyReason.split(OptionTreeSeparator).reverse()[0]}
                    </Tag>
                  ))
                )}
              </Text>
            </Col>
          </Row>
        </Col>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            Campagnes en cours ({campaignInProgress.length})
          </Text>
          <Text spacing="mb-1w">
            {campaignInProgress.length === 0 ? (
              <>Aucune campagne associée</>
            ) : (
              campaignInProgress.map((campaign) => (
                <div key={campaign.id}>
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
              ))
            )}
          </Text>
        </Col>
      </Row>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCardMobilisation;
