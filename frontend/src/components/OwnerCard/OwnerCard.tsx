import { fr } from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Card from '@codegouvfr/react-dsfr/Card';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

import { HousingOwner, Owner } from '../../models/Owner';
import { age, birthdate } from '../../utils/dateUtils';
import { mailto } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import styles from './owner-card.module.scss';
import { isBanEligible } from '../../models/Address';
import OtherOwnerCard from './OtherOwnerCard';
import Label from '../Label/Label';

interface OwnerCardProps {
  owner: Owner | HousingOwner;
  coOwners?: HousingOwner[];
  housingCount: number;
  modify?: ReactNode;
}

function OwnerCard(props: OwnerCardProps) {
  const secondaryOwners =
    props.coOwners?.filter((owner) => owner.rank > 1) ?? [];
  const archivedOwners =
    props.coOwners?.filter((owner) => owner.rank <= 0) ?? [];

  return (
    <Card
      border={false}
      size="small"
      title={
        <>
          {props.modify}
          <Typography component="h1" variant="h4" mb={0} data-testid="fullName">
            {props.owner.fullName}
          </Typography>
          <Typography>Propriétaire principal</Typography>
        </>
      }
      desc={
        <>
          {props.owner.birthDate && (
            <Typography component="p" mb={1}>
              <span
                className={fr.cx(
                  'fr-icon-calendar-2-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              <Label as="span">Date de naissance</Label>
              <Typography component="p">
                {birthdate(props.owner.birthDate)} ({age(props.owner.birthDate)} ans)
              </Typography>
            </Typography>
          )}

          <section className={fr.cx('fr-mb-2w')}>
            <span
              className={fr.cx(
                'fr-icon-home-4-line',
                'fr-icon--sm',
                'fr-mr-1w'
              )}
              aria-hidden={true}
            />
            <Label as="span">Adresse postale</Label>
            <Typography mb={1}>
              {props.owner.banAddress
                ? props.owner.banAddress.label
                : props.owner.rawAddress.join(' ')}
            </Typography>
            {!isBanEligible(props.owner.banAddress) && (
              <Alert
                severity="info"
                classes={{ title: fr.cx('fr-mb-2w') }}
                title="Adresse à vérifier"
                description={
                  <>
                    <Typography>
                      Cette adresse issue de la BAN est différente de l’adresse
                      fiscale.
                    </Typography>
                    <Typography>
                      Cliquez sur “Modifier” pour valider l’adresse que vous
                      souhaitez utiliser.
                    </Typography>
                  </>
                }
              />
            )}
          </section>

          {props.owner.additionalAddress && (
            <Typography component="p" mb={1}>
              <span
                className={fr.cx(
                  'fr-icon-home-4-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              <Label as="span">Complément d’adresse</Label>
              <Typography component="p">
                {props.owner.additionalAddress}
              </Typography>
            </Typography>
          )}

          {props.owner.email && (
            <Typography component="p" mb={1}>
              <span
                className={fr.cx(
                  'fr-icon-mail-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              <Label as="span">Adresse mail</Label>
              <Typography component="p">
                <AppLink
                  className="mailto"
                  isSimple
                  to={mailto(props.owner.email)}
                >
                  {props.owner.email}
                </AppLink>
              </Typography>
            </Typography>
          )}

          {props.owner.phone && (
            <Typography component="p" mb={1}>
              <span
                className={fr.cx(
                  'fr-icon-phone-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              <Label as="span">Téléphone</Label>
              <Typography component="p">{props.owner.phone}</Typography>
            </Typography>
          )}

          {props.housingCount > 0 && (
            <Button
              title="Voir tous ses logements"
              priority="secondary"
              linkProps={{
                to: `/proprietaires/${props.owner.id}`
              }}
              className={styles.housingBouton}
            >
              Voir tous ses logements ({props.housingCount})
            </Button>
          )}

          {secondaryOwners && secondaryOwners?.length > 0 && (
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
