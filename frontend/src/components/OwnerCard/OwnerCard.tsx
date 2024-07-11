import { Icon, Text } from '../_dsfr';
import { ReactNode } from 'react';

import { HousingOwner, isHousingOwner, Owner } from '../../models/Owner';
import { birthdate } from '../../utils/dateUtils';
import { mailto } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import styles from './owner-card.module.scss';
import Card from '@codegouvfr/react-dsfr/Card';
import Button from '@codegouvfr/react-dsfr/Button';
import classNames from 'classnames';
import { isBanEligible } from '../../models/Address';
import Typography from '@mui/material/Typography';
import OtherOwnerCard from './OtherOwnerCard';
import Alert from '@codegouvfr/react-dsfr/Alert';

interface OwnerCardProps {
  owner: Owner | HousingOwner;
  coOwners?: HousingOwner[];
  housingCount: number;
  modify?: ReactNode;
}

function OwnerCard({ owner, coOwners, housingCount, modify }: OwnerCardProps) {
  const secondaryOwners = coOwners?.filter((_) => _.rank > 1);
  const archivedOwners = coOwners?.filter(
    (_) => _.rank === 0 || _.rank === -1 || _.rank === -2
  );

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
          <Typography>Propriétaire principal</Typography>
        </>
      }
      desc={
        <>
          {owner.birthDate && (
            <Text size="lg" className="fr-mb-0">
              <Text size="sm" className="zlv-label-icon">
                <Icon
                  name="fr-icon-calendar-2-line"
                  iconPosition="center"
                  size="xs"
                />
                <span>Date de naissance</span>
              </Text>
              <Text spacing="mb-1w">{birthdate(owner.birthDate)} </Text>
            </Text>
          )}

          <Text size="lg" className="fr-mb-0">
            <Text size="sm" className="zlv-label-icon">
              <Icon
                name="fr-icon-home-4-line"
                iconPosition="center"
                size="xs"
              />
              <span>Adresse postale</span>
            </Text>
            <Text className="fr-mb-0">
                {owner.banAddress?.houseNumber} {owner.banAddress?.street}
                <br />
                {owner.banAddress?.postalCode} {owner.banAddress?.city}
                {[owner, ...(coOwners ?? [])].find(
                  (owner) => !isBanEligible(owner.banAddress)
                ) && (
                  <Alert
                    severity="info"
                    className={classNames(styles.addressNotice, 'fr-mt-2w')}
                    title={
                      <>
                        <div className="fr-mb-2w">Adresse à vérifier</div>
                      </>
                    }
                    description={
                      <>
                        Cette adresse issue de la BAN est différente de
                        l’adresse fiscale.
                        <br />
                        Cliquez sur “Modifier” pour valider l’adresse que vous
                        souhaitez utiliser.
                      </>
                    }
                  ></Alert>
                )}
              </Text>
          </Text>

          {owner.additionalAddress && (
            <Text size="lg" className="fr-mb-0">
              <Text size="sm" className="zlv-label-icon">
                <Icon
                  name="fr-icon-home-4-line"
                  iconPosition="center"
                  size="xs"
                />
                <span>Complément d’adresse</span>
              </Text>
              <Text spacing="mb-1w">{owner.additionalAddress} </Text>
            </Text>
          )}

          {owner.email && (
            <Text size="lg" className="fr-mb-0">
              <Text size="sm" className="zlv-label-icon">
                <Icon
                  name="fr-icon-mail-line"
                  iconPosition="center"
                  size="xs"
                />
                <span>Adresse mail</span>
              </Text>
              <AppLink className="mailto" isSimple to={mailto(owner.email)}>
                  {owner.email}
              </AppLink>
            </Text>
          )}

          {owner.phone && (
            <Text size="lg" className="fr-mb-0">
              <Text size="sm" className="zlv-label-icon">
                <Icon
                  name="fr-icon-phone-line"
                  iconPosition="center"
                  size="xs"
                />
                <span>Téléphone</span>
              </Text>
              <Text spacing="mb-1w">{owner.phone} </Text>
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

          {secondaryOwners && secondaryOwners.length > 0 && (
            <>
              <Typography component="h2" variant="h6" mb={1} mt={4}>
                Propriétaires secondaires ({secondaryOwners.length})
              </Typography>
              <hr />
              {secondaryOwners.map((housingOwner) => (
                <OtherOwnerCard owner={housingOwner} key={housingOwner.id} />
              ))}
            </>
          )}

          {archivedOwners && archivedOwners.length > 0 && (
            <>
              <Typography component="h2" variant="h6" mb={1} mt={4}>
                Propriétaires archivés ({archivedOwners.length})
              </Typography>
              <hr />
              {archivedOwners.map((housingOwner) => (
                <OtherOwnerCard owner={housingOwner} key={housingOwner.id} />
              ))}
            </>
          )}
        </>
      }
    ></Card>
  );
}

export default OwnerCard;
