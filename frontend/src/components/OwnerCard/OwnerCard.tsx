import { Icon, Text, Title } from '../_dsfr';
import React, { ReactNode } from 'react';

import {
  getHousingOwnerRankLabel,
  HousingOwner,
  isHousingOwner,
  Owner,
} from '../../models/Owner';
import { age, birthdate } from '../../utils/dateUtils';
import { mailto } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import styles from './owner-card.module.scss';
import Card from '@codegouvfr/react-dsfr/Card';
import Button from '@codegouvfr/react-dsfr/Button';
import classNames from 'classnames';
import Notice from '@codegouvfr/react-dsfr/Notice';
import { isBanEligible } from '../../models/Address';
import { getOwnerKindLabel } from '../../models/HousingFilters';
import Label from '../Label/Label';

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
          {getOwnerKindLabel(owner) && (
            <div className="fr-pt-1w">
              <Label>Type</Label>
              <Text size="lg" spacing="mb-0">
                {getOwnerKindLabel(owner)}
              </Text>
            </div>
          )}
          {isHousingOwner(owner) && (
            <Button
              title="Voir tous ses logements"
              priority="secondary"
              linkProps={{
                to: `/proprietaires/${owner.id}`,
              }}
              className={styles.housingBouton}
            >
              Voir tous ses logements ({housingCount})
            </Button>
          )}

          <div className="bg-975 fr-my-3w fr-px-2w fr-py-2w">
            <Title
              as="h2"
              look="h6"
              spacing="mb-1w"
              className={styles.titleInline}
            >
              Coordonnées du propriétaire
            </Title>
            <hr />
            <div>
              <Label>Adresse postale</Label>
              <Text className="fr-mb-0">
                {owner.banAddress?.houseNumber} {owner.banAddress?.street}
                <br />
                {owner.banAddress?.postalCode} {owner.banAddress?.city}
                {[owner, ...(coOwners ?? [])].find(
                  (owner) => !isBanEligible(owner.banAddress)
                ) && (
                  <Notice
                    className={classNames(styles.addressNotice, 'fr-mt-2w')}
                    title={
                      <>
                        <div className="fr-mb-2w">ADRESSE À VÉRIFIER</div>
                        L'adresse d’un des propriétaires nécessite votre
                        vérification.
                        <br />
                        Cliquez sur Modifier ci-dessus.
                      </>
                    }
                  ></Notice>
                )}
              </Text>
            </div>
            {owner.additionalAddress && (
              <div>
                <Label>Complément d'adresse</Label>
                <Text className="fr-mb-0">{owner.additionalAddress}</Text>
              </div>
            )}
            {owner.email && (
              <div>
                <Label>Adresse mail</Label>
                <AppLink className="mailto" isSimple to={mailto(owner.email)}>
                  {owner.email}
                </AppLink>
              </div>
            )}
            {owner.phone && (
              <div>
                <Label>Téléphone</Label>
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
                  enlargeLink
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
                      <Text as="span" className="color-black-50">
                        <b>{housingOwner.fullName}</b>
                      </Text>
                    </>
                  }
                  desc={
                    <>
                      <Label as="span">
                        {getHousingOwnerRankLabel(housingOwner.rank)}
                      </Label>
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
                  classes={{ end: 'd-none' }}
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
