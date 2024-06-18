import { useMemo } from 'react';
import { Col, Container, Row, Text } from '../../components/_dsfr';

import { useLocation, useParams } from 'react-router-dom';
import OwnerProspectForm from './OwnerProspectForm';
import handsPoints from '../../assets/images/hands-point.svg';
import handsGrip from '../../assets/images/hands-grip.svg';
import handsPinch from '../../assets/images/hands-pinch.svg';
import handsShow from '../../assets/images/hands-show.svg';
import { unCapitalize } from '../../utils/stringUtils';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './home.module.scss';
import ContactPointCard from '../../components/ContactPoint/ContactPointCard';
import EstablishmentLinkList from '../../components/EstablishmentLinkList/EstablishmentLinkList';
import LocalityTaxesCard from '../../components/LocalityTaxesCard/LocalityTaxesCard';
import { TaxKinds } from '../../models/Locality';
import { OwnerProspect } from '../../models/OwnerProspect';
import { useAppSelector } from '../../hooks/useStore';
import classNames from 'classnames';
import { useFindContactPointsQuery } from '../../services/contact-point.service';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useSettings } from '../../hooks/useSettings';

import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Button from '@codegouvfr/react-dsfr/Button';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../models/TrackEvent';
import { useMatomo } from '@jonkoops/matomo-tracker-react';

import { useEstablishment } from '../../hooks/useEstablishment';
import { useCreateOwnerProspectMutation } from '../../services/owner-prospect.service';
import Typography from '@mui/material/Typography';

const OwnerEstablishmentHomeView = () => {
  const { pathname } = useLocation();
  const { trackEvent } = useMatomo();

  const { establishmentRef } = useParams<{ establishmentRef: string }>();

  const [createOwnerProspect, { isSuccess: isCreateSuccess }] =
    useCreateOwnerProspectMutation();

  const { addressSearchResult } = useAppSelector(
    (state) => state.ownerProspect
  );

  const isLocality = useMemo(
    () => pathname.startsWith('/communes'),
    [pathname]
  );

  const { refName, geoCode } = useMemo(
    () => ({
      refName: isLocality
        ? establishmentRef.slice(0, establishmentRef.lastIndexOf('-'))
        : establishmentRef,
      geoCode: isLocality
        ? establishmentRef.slice(establishmentRef.lastIndexOf('-') + 1)
        : undefined
    }),
    [establishmentRef, isLocality]
  );

  const { establishment, nearbyEstablishments, epciEstablishment } =
    useEstablishment(refName, geoCode ? [geoCode] : undefined);

  const { settings } = useSettings(establishment?.id ?? epciEstablishment?.id);

  const { data: contactPoints } = useFindContactPointsQuery(
    {
      establishmentId: (establishment?.available
        ? establishment?.id
        : epciEstablishment?.id)!,
      publicOnly: true
    },
    {
      skip: !(establishment?.available
        ? establishment?.id
        : epciEstablishment?.id)
    }
  );

  useDocumentTitle(establishment?.name);
  const { localities } = useLocalityList(establishment?.id);

  const onCreateOwnerProspect = (ownerProspect: OwnerProspect) => {
    trackEvent({
      category: TrackEventCategories.OwnerProspect,
      action: TrackEventActions.OwnerProspect.SubmitContact
    });
    createOwnerProspect(ownerProspect);
  };

  return (
    <main>
      {establishment && (
        <Container as="section" spacing="py-7w" className="py-xs-3w">
          <Row gutters>
            <Col>
              <Typography
                component="h1"
                variant="h2"
                className="color-bf525"
                spacing="mb-1w"
              >
                {establishment.shortName.toUpperCase()}
              </Typography>
              <Typography component="h2" variant="h1" mb={3}>
                Bienvenue sur le site d’information pour les propriétaires de
                logements vacants
              </Typography>
              {establishment.available ? (
                <Tag className="fr-mb-2w bg-bf925">
                  {isLocality ? 'Commune' : 'Collectivité'} engagée contre la
                  vacance
                </Tag>
              ) : (
                epciEstablishment?.available && (
                  <Tag className="fr-mb-2w bg-bf925">
                    Commune au sein d’une intercommunalité engagée contre la
                    vacance
                  </Tag>
                )
              )}
              {establishment.available || epciEstablishment?.available ? (
                <>
                  <Text>
                    <b>
                      {isLocality ? (
                        <>La {unCapitalize(establishment.name)}</>
                      ) : (
                        establishment.name
                      )}
                    </b>
                      s’engage à lutter contre la vacance au côté de l’outil 
                    <span className="color-bf113 weight-400">
                      Zéro Logement Vacant.
                    </span>
                  </Text>
                </>
              ) : (
                <Text>
                  <b>
                    {isLocality ? (
                      <>La {unCapitalize(establishment.name)}</>
                    ) : (
                      establishment.name
                    )}
                  </b>
                    n’utilise pas encore l’outil 
                  <span className="color-bf113 weight-400">
                    Zéro Logement Vacant
                  </span>
                  . Il se peut que les informations soient incomplètes.
                </Text>
              )}
            </Col>
            <Col className="align-right d-none d-sm-block">
              <img
                src={handsPoints}
                style={{ maxWidth: '100%', height: '100%' }}
                alt=""
              />
            </Col>
          </Row>
        </Container>
      )}
      {localities && localities.length > 0 && (
        <Container as="section" spacing="py-6w" className="py-xs-3w">
          <Typography component="h2" variant="h3" mb={3}>
            Les taxes sur la vacance
          </Typography>
          {isLocality ? (
            <div className="bg-bf950 fr-p-3w">
              {localities[0].taxKind === TaxKinds.None ? (
                <>
                  <Typography component="h3" variant="h5" mb={1}>
                    Votre logement vacant n’est pas soumis à une taxe.
                  </Typography>
                  <Text spacing="mb-0">
                    La commune de {localities[0].name} n’applique pas de taxe
                    spécifique sur les logements vacants.
                  </Text>
                </>
              ) : (
                <>
                  <Typography component="h3" variant="h5" mb={1}>
                    Votre logement vacant est soumis à une taxe.
                  </Typography>
                  {localities[0].taxKind === TaxKinds.TLV && (
                    <>
                      <Text spacing="mb-1w">
                        La commune de {localities[0].name} applique la
                        <b>Taxe sur les Logements Vacants (TLV).</b>
                      </Text>
                      <Text spacing="m-0">
                        Le taux pour la première année est de <b>17%</b> puis de
                        <b>34%</b> les années suivantes.
                      </Text>
                    </>
                  )}
                  {localities[0].taxKind === TaxKinds.THLV && (
                    <>
                      <Text spacing="mb-1w">
                        La commune de {localities[0].name} applique la
                        <b>
                          Taxe d’Habitation sur les Logements Vacants (THLV).
                        </b>
                      </Text>
                      {localities[0].taxRate ? (
                        <Text spacing="m-0">
                          Le taux après 2 années de vacance est de 
                          <b>{localities[0].taxRate}%</b>.
                        </Text>
                      ) : (
                        <Text spacing="m-0">
                          Le taux appliqué est cependant inconnu. Veuillez vous
                          rapprocher de votre commune pour en savoir plus.
                        </Text>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <Row gutters>
              {localities?.map((locality) => (
                <Col className="fr-col-12 fr-col-sm-4" key={locality.geoCode}>
                  <LocalityTaxesCard
                    locality={locality}
                    isPublicDisplay={true}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Container>
      )}
      <Container as="section" spacing="py-6w" className="py-xs-3w">
        <Typography component="h2" variant="h3" mb={3}>
          Pourquoi sortir de la vacance ?
        </Typography>
        <Row gutters>
          <Col className={classNames(styles.cardCol, 'fr-col-12 fr-col-sm-4')}>
            <div>
              <img src={handsGrip} alt="" />
            </div>
            <Typography component="h4" variant="h6" spacing="my-1w">
              Ne plus être assujetti à la taxe
            </Typography>
            <Text>
              En remettant votre logement sur le marché, par la réoccupation, la
              location ou la vente, vous ne serez plus soumis à la taxation sur
              la vacance. Vous pourrez instantanément déclarer ce changement via
              le nouveau portail des impôts : Gérer Mes Biens Immobiliers.
            </Text>
          </Col>
          <Col className={classNames(styles.cardCol, 'fr-col-12 fr-col-sm-4')}>
            <div>
              <img src={handsShow} style={{ maxWidth: '100%' }} alt="" />
            </div>
            <Typography component="h4" variant="h6" spacing="my-1w">
              Protéger votre patrimoine
            </Typography>
            <Text>
              L’inoccupation à long terme accroit les risques de dégradations et
              de squats. Louer ou vendre vous protégera de ces dommages tout en
              générant des revenus complémentaires. En louant, vous pourrez
              aussi bénéficier d’avantages fiscaux tels que le Loc’Avantages.
            </Text>
          </Col>
          <Col className={classNames(styles.cardCol, 'fr-col-12 fr-col-sm-4')}>
            <div>
              <img src={handsPinch} alt="" />
            </div>
            <Typography component="h4" variant="h6" spacing="my-1w">
              Contribuez à réduire la crise du logement
            </Typography>
            <Text>
              En mettant votre bien en location ou en le vendant pour qu’il soit
              réoccupé, vous aiderez les personnes en quête d’un logement. Vous
              contribuerez aussi à la vitalité ou à la revitalisation de votre
              territoire.
            </Text>
          </Col>
        </Row>
      </Container>
      {contactPoints && contactPoints.length > 0 && (
        <Container as="section" spacing="py-6w" className="py-xs-3w">
          <Typography component="h2" variant="h3" mb={3}>
            Les guichets contacts
          </Typography>
          <Row gutters>
            {contactPoints?.map((contactPoint) => (
              <Col className="fr-col-12 fr-col-sm-4" key={contactPoint.id}>
                <ContactPointCard
                  contactPoint={contactPoint}
                  isPublicDisplay={true}
                />
              </Col>
            ))}
          </Row>
        </Container>
      )}
      <div className="bg-bf950">
        <Container as="section" spacing="py-11w" className="py-xs-0">
          <Row gutters>
            {(establishment?.available || epciEstablishment?.available) &&
              settings?.inbox?.enabled && (
                <Col
                  className={classNames(
                    styles.ownerFormContainer,
                    'fr-col-12',
                    'fr-col-sm-7'
                  )}
                >
                  <Text className="color-bf525" spacing="mb-1w">
                    PROPRIÉTAIRE DE LOGEMENT VACANT
                  </Text>
                  <Typography component="h2" variant="h2" mb={1}>
                    Vous souhaitez sortir votre logement de la vacance ?
                  </Typography>
                  <Text size="md" className="subtitle">
                    Votre collectivité peut vous aider. Laissez vos coordonnées
                    pour être recontacté par votre collectivité.
                  </Text>
                  {isCreateSuccess ? (
                    <Alert
                      description="Merci de votre prise de contact. Votre demande a été bien prise en compte et sera traitée dans les meilleurs délais par l’équipe Zéro Logement Vacant."
                      severity="success"
                      small
                    />
                  ) : (
                    <OwnerProspectForm
                      onCreateOwnerProspect={onCreateOwnerProspect}
                      addressSearchResult={addressSearchResult}
                    />
                  )}
                </Col>
              )}
            <Col
              className={classNames(styles.ownerFormContainer, 'h-fit-content')}
            >
              <Typography component="h2" variant="h2" mb={1}>
                Votre logement n’est pas vacant ?
              </Typography>
              <Text size="md" className="subtitle">
                Rendez-vous sur le site Gérer mes biens immobiliers, le service
                pour les usagers propriétaires.
              </Text>
              <Button
                linkProps={{
                  to: 'https://www.impots.gouv.fr/actualite/gerer-mes-biens-immobiliers-un-nouveau-service-en-ligne-pour-les-usagers-proprietaires-1',
                  target: '_blank'
                }}
              >
                Se rendre sur le site de GMBI
              </Button>
            </Col>
          </Row>
        </Container>
      </div>
      {nearbyEstablishments && (
        <Container as="section" spacing="my-6w">
          <EstablishmentLinkList
            establishments={nearbyEstablishments}
            title="Communes aux alentours"
          />
        </Container>
      )}
    </main>
  );
};

export default OwnerEstablishmentHomeView;
