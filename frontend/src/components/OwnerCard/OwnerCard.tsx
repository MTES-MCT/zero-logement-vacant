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
import { fr } from '@codegouvfr/react-dsfr';

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
            <Typography component="p" mb={1}>
              <span className={fr.cx("fr-icon-calendar-2-line", "fr-icon--sm", "fr-mr-1w")} aria-hidden={true} />
              <Typography component="span" fontSize={'0.875rem'} fontWeight={700} color={'var(--grey-425)'}>Date de naissance</Typography>
              <Typography component="p">
                {birthdate(owner.birthDate)}
              </Typography>
            </Typography>
          )}

          <Typography component="p" mb={1}>
            <span className={fr.cx("fr-icon-home-4-line", "fr-icon--sm", "fr-mr-1w")} aria-hidden={true} />
            <Typography component="span" fontSize={'0.875rem'} fontWeight={700} color={'var(--grey-425)'}>Adresse postale</Typography>
            <Typography component="p">
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
            </Typography>
          </Typography>

          {owner.additionalAddress && (
            <Typography component="p" mb={1}>
              <span className={fr.cx("fr-icon-home-4-line", "fr-icon--sm", "fr-mr-1w")} aria-hidden={true} />
              <Typography component="span" fontSize={'0.875rem'} fontWeight={700} color={'var(--grey-425)'}>Complément d’adresse</Typography>
              <Typography component="p">
                {owner.additionalAddress}
              </Typography>
            </Typography>
          )}

          {owner.email && (
            <Typography component="p" mb={1}>
              <span className={fr.cx("fr-icon-mail-line", "fr-icon--sm", "fr-mr-1w")} aria-hidden={true} />
              <Typography component="span" fontSize={'0.875rem'} fontWeight={700} color={'var(--grey-425)'}>Adresse mail</Typography>
              <Typography component="p">
                <AppLink className="mailto" isSimple to={mailto(owner.email)}>
                    {owner.email}
                </AppLink>
              </Typography>
            </Typography>
          )}

          {owner.phone && (
            <Typography component="p" mb={1}>
              <span className={fr.cx("fr-icon-phone-line", "fr-icon--sm", "fr-mr-1w")} aria-hidden={true} />
              <Typography component="span" fontSize={'0.875rem'} fontWeight={700} color={'var(--grey-425)'}>Téléphone</Typography>
              <Typography component="p">
                {owner.phone}
              </Typography>
            </Typography>
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
