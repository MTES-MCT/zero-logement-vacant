import { Icon, Text, Title } from '../../components/dsfr/index';
import React, { ReactNode } from 'react';

import {
  getHousingOwnerRankLabel,
  HousingOwner,
  isHousingOwner,
  Owner,
} from '../../models/Owner';
import { age, birthdate } from '../../utils/dateUtils';
import classNames from 'classnames';
import { capitalize, mailto } from '../../utils/stringUtils';
import AppLink from '../AppLink/AppLink';
import styles from './owner-card.module.scss';
import Card from '@codegouvfr/react-dsfr/Card';

interface OwnerCardProps {
  owner: Owner | HousingOwner;
  coOwners?: HousingOwner[];
  housingCount: number;
  modify?: ReactNode;
}

function OwnerCard({ owner, coOwners, housingCount, modify }: OwnerCardProps) {
  return (
    <Card
      border={false}
      size="small"
      title={
        <>
          <span className="card-title-icon">
            <Icon name="fr-icon-user-fill" iconPosition="center" size="1x" />
          </span>
          {modify}
          <Title as="h1" look="h4" spacing="mb-0" data-testid="fullName">
            {owner.fullName}
          </Title>
        </>
      }
      desc={
        <>
          {owner.birthDate && (
            <Text size="lg" className="fr-mb-0">
              né(e) le {birthdate(owner.birthDate)}{' '}
              <b>({age(owner.birthDate)} ans)</b>
            </Text>
          )}
          {isHousingOwner(owner) && (
            <AppLink
              title="Voir tous ses logements"
              to={
                (window.location.pathname.indexOf('proprietaires') === -1
                  ? window.location.pathname
                  : '') +
                '/proprietaires/' +
                owner.id
              }
              className={classNames(
                styles.housingBouton,
                'fr-btn--md',
                'fr-btn',
                'fr-btn--secondary'
              )}
            >
              Voir tous ses logements ({housingCount})
            </AppLink>
          )}

          <div className="bg-975 fr-my-3w fr-px-2w fr-py-2w">
            <Title
              as="h2"
              look="h6"
              spacing="mb-1w"
              className={styles.titleInline}
            >
              Coordonnées
            </Title>
            <hr />
            <div>
              <Text size="sm" className="zlv-label">
                Adresse postale
              </Text>
              {owner.rawAddress.map((address, i) => (
                <Text
                  className="capitalize"
                  key={`${owner.id}_address_${i}`}
                  spacing="mb-0"
                >
                  {capitalize(address)}
                </Text>
              ))}
            </div>
            {owner.email && (
              <div>
                <Text size="sm" className="zlv-label">
                  Adresse mail
                </Text>
                <AppLink className="mailto" isSimple to={mailto(owner.email)}>
                  {owner.email}
                </AppLink>
              </div>
            )}
            {owner.phone && (
              <div>
                <Text size="sm" className="zlv-label">
                  Téléphone
                </Text>
                <Text spacing="mb-0">{owner.phone}</Text>
              </div>
            )}
          </div>
          {coOwners && coOwners.length > 0 && (
            <>
              <Title as="h2" look="h6" spacing="mb-1w">
                Autres propriétaires ({coOwners.length})
              </Title>
              <hr />
              {coOwners.map((housingOwner) => (
                <Card
                  key={'owner_' + housingOwner.rank}
                  linkProps={{
                    to: '/proprietaires/' + housingOwner.id,
                  }}
                  className={classNames(
                    'fr-mb-1w',
                    styles.coOwnerCard,
                    'app-card-xs'
                  )}
                  title={
                    <>
                      <span className="icon-xs">
                        <Icon
                          name="fr-icon-user-fill"
                          iconPosition="center"
                          size="xs"
                        />
                      </span>
                      <Text as="span">
                        <b>{housingOwner.fullName}</b>
                      </Text>
                    </>
                  }
                  desc={
                    <>
                      <Text size="sm" className="zlv-label" as="span">
                        {getHousingOwnerRankLabel(housingOwner.rank)}
                      </Text>
                      <Text
                        as="span"
                        spacing="mb-0 mr-1w"
                        className="float-right fr-link"
                      >
                        Voir la fiche
                        <Icon
                          name="fr-icon-arrow-right-line"
                          size="lg"
                          verticalAlign="middle"
                          iconPosition="center"
                        />
                      </Text>
                    </>
                  }
                ></Card>
              ))}
            </>
          )}
        </>
      }
    ></Card>
  );
}

export default OwnerCard;
