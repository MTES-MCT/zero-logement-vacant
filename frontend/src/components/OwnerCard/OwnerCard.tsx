import { Icon, Text } from '../_dsfr';
import { ReactNode } from 'react';

import {
  getHousingOwnerRankLabel,
  HousingOwner,
  isHousingOwner,
  Owner
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
import Typography from '@mui/material/Typography';

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
          {modify}
          <Typography component="h1" variant="h4" mb={0} data-testid="fullName">
            {owner.fullName}
          </Typography>
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
            <Button
              title="Voir tous ses logements"
              priority="secondary"
              linkProps={{
                to: `/proprietaires/${owner.id}`
              }}
              className={styles.housingBouton}
            >
              Voir tous ses logements ({housingCount})
            </Button>
          )}

          <div className="bg-975 fr-my-3w fr-px-2w fr-py-2w">
            <Typography
              component="h2"
              variant="h6"
              mb={1}
              className={styles.titleInline}
            >
              Coordonnées du propriétaire
            </Typography>
            <hr />
            <div>
              <Text size="sm" className="zlv-label">
                Adresse postale
              </Text>
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
                        Cette adresse issue de la BAN est différente de
                        l’adresse fiscale.
                        <br />
                        Cliquez sur “Modifier” pour valider l’adresse que vous
                        souhaitez utiliser.
                      </>
                    }
                  ></Notice>
                )}
              </Text>
            </div>
            {owner.additionalAddress && (
              <div>
                <Text size="sm" className="zlv-label">
                  Complément d’adresse
                </Text>
                <Text className="fr-mb-0">{owner.additionalAddress}</Text>
              </div>
            )}
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
              <Typography component="h2" variant="h6" mb={1}>
                Autres propriétaires ({coOwners.length})
              </Typography>
              <hr />
              {coOwners.map((housingOwner) => (
                <Card
                  enlargeLink
                  key={'owner_' + housingOwner.rank}
                  linkProps={{
                    to: '/proprietaires/' + housingOwner.id
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
