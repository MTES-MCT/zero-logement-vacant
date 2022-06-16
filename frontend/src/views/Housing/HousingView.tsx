import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Col, Container, Link as DSFRLink, Row, Tab, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import {
    getHousing,
    getHousingEvents,
    getHousingOwners,
    updateHousing,
    updateHousingOwners,
} from '../../store/actions/housingAction';
import { differenceInYears, format, isValid } from 'date-fns';
import { capitalize } from '../../utils/stringUtils';
import classNames from 'classnames';
import styles from '../Owner/owner.module.scss';
import { getHousingState, getHousingSubStatus, getPrecision } from '../../models/HousingState';
import { getBuildingLocation, Housing, HousingUpdate, OwnershipKindLabels, OwnershipKinds } from '../../models/Housing';
import config from '../../utils/config';
import EventsHistory from '../../components/EventsHistory/EventsHistory';
import HousingStatusModal from '../../components/modals/HousingStatusModal/HousingStatusModal';
import HousingOwnersModal from '../../components/modals/HousingOwnersModal/HousingOwnersModal';
import { HousingOwner } from '../../models/Owner';
import HousingAdditionalOwners from './HousingAdditionalOwners';
import { FormState } from '../../store/actions/FormState';
import { LocalityKindLabels } from '../../models/Establishment';

const HousingView = () => {

    const dispatch = useDispatch();

    const { housingId } = useParams<{housingId: string}>();

    const { housing, housingOwners, events, housingOwnersUpdateFormState } = useSelector((state: ApplicationState) => state.housing);
    const [isModalStatusOpen, setIsModalStatusOpen] = useState(false);
    const [isModalOwnersOpen, setIsModalOwnersOpen] = useState(false);

    useEffect(() => {
        dispatch(getHousing(housingId));
        dispatch(getHousingOwners(housingId));
        dispatch(getHousingEvents(housingId));
    }, [housingId, dispatch])


    const submitHousingUpdate = (housing: Housing, housingUpdate: HousingUpdate) => {
        dispatch(updateHousing(housing, housingUpdate))
        setIsModalStatusOpen(false)
    }

    const submitHousingOwnersUpdate = (housingOwnersUpdated: HousingOwner[]) => {
        if (housing) {
            dispatch(updateHousingOwners(housing.id, housingOwnersUpdated))
            setIsModalOwnersOpen(false)
        }
    }



    return (
        <>
            {housing && <>
                <div className="bg-100">
                    <Container>
                        <AppBreadcrumb />
                        <Row alignItems="middle">
                            <Col>
                                <Title as="h1" className="fr-pt-2w fr-mb-1w">
                                    {housing.rawAddress.join(' - ')}
                                </Title>
                                <b>Invariant fiscal :</b> {housing.invariant}
                                <Text className="fr-pt-1w">
                                    {housing.status &&
                                        <span style={{
                                            backgroundColor: `var(${getHousingState(housing.status).bgcolor})`,
                                            color: `var(${getHousingState(housing.status).color})`,
                                        }}
                                              className='status-label'>
                                            {getHousingState(housing.status).title}
                                        </span>
                                    }
                                    {housing.subStatus &&
                                        <span style={{
                                            backgroundColor: `var(${getHousingSubStatus(housing)?.bgcolor})`,
                                            color: `var(${getHousingSubStatus(housing)?.color})`,
                                        }}
                                              className='status-label'>
                                                {housing.subStatus}
                                            </span>
                                    }
                                    {housing.precisions && housing.precisions.map((precision, index) =>
                                        <b key={'precision_' + index} className='status-label'>
                                            {housing.status && housing.subStatus &&
                                                <span style={{
                                                    backgroundColor: `var(${getPrecision(housing.status, housing.subStatus, precision)?.bgcolor})`,
                                                    color: `var(${getPrecision(housing.status, housing.subStatus, precision)?.color})`,
                                                }}
                                                      className='status-label'>
                                                        {precision}
                                                    </span>
                                            }
                                        </b>)
                                    }
                                </Text>
                            </Col>
                            <Col>
                                <Button title="Modifier le dossier"
                                        icon="fr-fi-edit-line"
                                        className="float-right"
                                        onClick={() => {setIsModalStatusOpen(true)}}>
                                    Modifier le dossier
                                </Button>
                                {isModalStatusOpen &&
                                    <HousingStatusModal housingList={[housing]}
                                                        onSubmit={submitHousingUpdate}
                                                        onClose={() => setIsModalStatusOpen(false)} />
                                }
                            </Col>
                        </Row>
                    </Container>
                </div>
                <Container spacing="py-4w">
                    {housingOwnersUpdateFormState === FormState.Succeed &&
                        <div className="fr-my-2w">
                            <Alert title="" description="La modification des propriétaires a bien été effectuée" type="success" closable/>
                        </div>
                    }
                    <Row className="fr-grid-row--center">
                        <Col n="6" className="bordered fr-py-2w fr-px-3w">
                            <Row>
                                <Col>
                                    <Title as="h2" look="h3">{housingOwners && housingOwners.length > 1 ? 'Propriétaires' : 'Propriétaire'}</Title>
                                </Col>
                                {housingOwners &&
                                    <Col>
                                        <Button title="Modifier les propriétaires"
                                                secondary
                                                size="sm"
                                                icon="fr-fi-edit-line"
                                                className="float-right"
                                                onClick={() => {
                                                    setIsModalOwnersOpen(true)
                                                }}>
                                            Modifier
                                        </Button>
                                        {isModalOwnersOpen &&
                                            <HousingOwnersModal housingOwners={housingOwners}
                                                                onSubmit={submitHousingOwnersUpdate}
                                                                onClose={() => setIsModalOwnersOpen(false)}/>
                                        }
                                    </Col>
                                }
                            </Row>
                            {housingOwners &&
                                <Tabs>
                                    {housingOwners.filter(_ => _.rank).map(owner =>
                                        <Tab label={owner.rank === 1 ? 'Principal' : `${owner.rank}ème`} key={owner.id}>
                                            <Row>
                                                <Col>
                                                    <Text size="lg" className="fr-mb-1w">
                                                        <b>Identité</b>
                                                    </Text>
                                                </Col>
                                                <Col className="align-right">
                                                    <Link title="Accéder à la fiche" to={(location.pathname.indexOf('proprietaires') === -1 ? location.pathname : '') + '/proprietaires/' + owner.id} className="ds-fr--inline fr-link">
                                                        Accéder à la fiche<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                                                    </Link>
                                                </Col>
                                            </Row>
                                            <hr/>
                                            <Text size="md" className="fr-mb-1w">
                                                <b>Nom prénom :&nbsp;</b>
                                                <span data-testid="fullName-text">{owner.fullName}</span>
                                            </Text>
                                            {owner.birthDate && isValid(owner.birthDate) &&
                                                <Text size="md" className="fr-mb-1w">
                                                    <b>Date de naissance :&nbsp;</b>
                                                    <span className="capitalize"
                                                          data-testid="birthDate-text">{format(owner.birthDate, 'dd/MM/yyyy')}</span>
                                                    <span> ({differenceInYears(new Date(), owner.birthDate)} ans)</span>
                                                </Text>
                                            }

                                            <Text size="lg" className="fr-pt-5w fr-mb-1w">
                                                <b>Coordonnées</b>
                                            </Text>
                                            <hr/>
                                            <Text size="md" className="fr-mb-1w">
                                                <span style={{ verticalAlign: 'top' }}>
                                                    <b>Adresse postale :&nbsp;</b>
                                                </span>
                                                <span style={{ display: 'inline-block' }}>
                                                    <span className="capitalize">
                                                        {owner.rawAddress.map((_, i) =>
                                                            <span style={{ display: 'block' }}
                                                                  key={housingId + '_address_' + i}>{capitalize(_)}</span>)
                                                        }
                                                    </span>
                                                </span>
                                            </Text>
                                            <Text size="md" className="fr-mb-1w">
                                                <b>Adresse mail :&nbsp;</b>
                                                <span data-testid="email-text">{owner.email}</span>
                                            </Text>
                                            <Text size="md" className="fr-mb-1w">
                                                <b>Numéro de téléphone :&nbsp;</b>
                                                <span data-testid="phone-text">{owner.phone}</span>
                                            </Text>
                                        </Tab>
                                    )}
                                    <Tab label="+ Ajouter">
                                        <HousingAdditionalOwners housingOwners={housingOwners} housingId={housing.id}/>
                                    </Tab>
                                </Tabs>
                            }
                        </Col>
                        <Col n="6" className="fr-py-2w fr-px-3w">
                            <EventsHistory events={events ?? []} />
                        </Col>
                    </Row>
                    <div className={classNames('bg-100','fr-p-3w','fr-my-2w', styles.ownerHousing)}>
                        <Row>
                            <Col>
                                <Title as="h2" look="h3" className="fr-mb-0">
                                    Caractéristiques du logement
                                </Title>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Text size="xs" className="fr-mb-2w">
                                    <b>Invariant fiscal :&nbsp;</b>{housing.invariant}
                                    <br />
                                    <b>Référence cadastrale :&nbsp;</b>{housing.cadastralReference}
                                    <br />
                                    <b> {housing.dataYears.length === 1 ? 'Millésime' : 'Millésimes'} :&nbsp;</b>{housing.dataYears.join(' - ')}
                                </Text>
                            </Col>
                        </Row>
                        <Row>
                            <Col n="4">
                                <Text size="lg" className="fr-mb-1w">
                                    <b>Emplacement</b>
                                </Text>
                                <hr />
                                <span style={{verticalAlign: 'top'}}>
                                    <b>Adresse :&nbsp;</b>
                                </span>
                                <span style={{display: 'inline-block'}} className="capitalize">
                                        <span  style={{display: 'block'}}>
                                            {housing.rawAddress.map((_, i) =>
                                                <span style={{display: 'block'}} key={housingId + '_address_' + i}>{capitalize(_)}</span>)
                                            }
                                        </span>
                                    </span>
                                {getBuildingLocation(housing) &&
                                    <div>
                                            <span style={{verticalAlign: 'top'}}>
                                                <b>Complément :&nbsp;</b>
                                            </span>
                                        <span style={{display: 'inline-block'}} className="capitalize">
                                                <span  style={{display: 'block'}}>
                                                    <span  style={{display: 'block'}}>{getBuildingLocation(housing)?.building}</span>
                                                    <span  style={{display: 'block'}}>{getBuildingLocation(housing)?.entrance}</span>
                                                    <span  style={{display: 'block'}}>{getBuildingLocation(housing)?.level}</span>
                                                    <span  style={{display: 'block'}}>{getBuildingLocation(housing)?.local}</span>
                                                </span>
                                            </span>
                                    </div>
                                }
                                <div className="fr-mt-2w">
                                    <DSFRLink title="Localiser dans Google Map - nouvelle fenêtre"
                                          href={`https://www.google.com/maps/place/${housing.longitude},${housing.latitude}`}
                                          target="_blank">
                                        Localiser
                                    </DSFRLink>
                                </div>
                                {housing.localityKind &&
                                    <Text size="md" className="fr-mt-2w fr-mb-1w">
                                        <b>Type de commune :&nbsp;</b>
                                        {LocalityKindLabels[housing.localityKind]}
                                    </Text>
                                }
                            </Col>
                            <Col n="4">
                                <Text size="lg" className="fr-mb-1w">
                                    <b>Caractéristiques</b>
                                </Text>
                                <hr />
                                <Text size="md" className="fr-mb-1w">
                                    <b>Type :&nbsp;</b>
                                    {housing.housingKind}
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Surface :&nbsp;</b>
                                    {housing.livingArea} m2
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Pièces :&nbsp;</b>
                                    {housing.roomsCount}
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Construction :&nbsp;</b>
                                    {housing.buildingYear}
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>État :&nbsp;</b>
                                    {housing.uncomfortable && 'Inconfortable'}
                                    {!housing.uncomfortable && housing.cadastralClassification >= 4 && housing.cadastralClassification <= 6 && 'Confortable'}
                                    {!housing.uncomfortable && housing.cadastralClassification >= 1 && housing.cadastralClassification <= 3 && 'Très confortable'}
                                </Text>
                            </Col>
                            <Col n="4">
                                <Text size="lg" className="fr-mb-1w">
                                    <b>Situation</b>
                                </Text>
                                <hr />
                                <Text size="md" className="fr-mb-1w">
                                    <b>Durée de vacance au 01/01/{config.dataYear} :&nbsp;</b>
                                    {config.dataYear - housing.vacancyStartYear} ans ({housing.vacancyStartYear})
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Cause(s) de la vacance :&nbsp;</b>
                                    {housing.vacancyReasons?.map((reason, reasonIdx) =>
                                        <span key={`${housing.id}_${reasonIdx}`}><br />{reason}</span>
                                    )}
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Taxé :&nbsp;</b>
                                   {housing.taxed ? 'Oui' : 'Non'}
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Type de propriété :&nbsp;</b>
                                   {housing.ownershipKind === OwnershipKinds.Single && OwnershipKindLabels[OwnershipKinds.Single]}
                                   {housing.ownershipKind === OwnershipKinds.CoOwnership && OwnershipKindLabels[OwnershipKinds.CoOwnership]}
                                   {housing.ownershipKind === OwnershipKinds.Other && OwnershipKindLabels[OwnershipKinds.Other]}
                                </Text>
                            </Col>
                        </Row>
                        {housing.buildingHousingCount && housing.buildingHousingCount > 1 &&
                            <Row spacing="pt-4w">
                                <Col n="4">
                                    <Text size="lg" className="fr-mb-1w">
                                        <b>Immeuble</b>
                                    </Text>
                                    <hr />
                                    <Text size="md" className="fr-mb-1w">
                                        <b>Nombre de logements :&nbsp;</b>
                                        {housing.buildingHousingCount}
                                    </Text>
                                    <Text size="md" className="fr-mb-1w">
                                        <b>Taux de vacance :&nbsp;</b>
                                        {housing.buildingVacancyRate} %
                                    </Text>
                                </Col>
                            </Row>
                        }
                    </div>
                    {housingOwners && housingOwners.filter(_ => !_.rank).length > 0 &&
                        <div className={classNames('bg-925','fr-p-3w','fr-my-2w', styles.ownerHousing)}>
                            <Row>
                                <Col>
                                    <Title as="h2" look="h3">
                                        {housingOwners.filter(_ => !_.rank).length === 1 ? 'Ancien propriétaire' : 'Anciens propriétaires'}
                                    </Title>
                                </Col>
                            </Row>
                            {housingOwners.filter(_ => !_.rank).map(housingOwner =>
                                <Row key={housingOwner.id}>
                                    <Col>
                                        <Text size="md" className="fr-mb-1w">
                                            <b>Nom prénom :&nbsp;</b>
                                            <span data-testid="fullName-text">{housingOwner.fullName}</span>
                                        </Text>
                                        {housingOwner.birthDate && isValid(housingOwner.birthDate) &&
                                            <Text size="md" className="fr-mb-1w">
                                                <b>Date de naissance :&nbsp;</b>
                                                <span className="capitalize"
                                                      data-testid="birthDate-text">{format(housingOwner.birthDate, 'dd/MM/yyyy')}</span>
                                                <span> ({differenceInYears(new Date(), housingOwner.birthDate)} ans)</span>
                                            </Text>
                                        }
                                    </Col>
                                    <Col>
                                        <Text size="md" className="fr-mb-1w">
                                                <span style={{ verticalAlign: 'top' }}>
                                                    <b>Adresse postale :&nbsp;</b>
                                                </span>
                                            <span style={{ display: 'inline-block' }}>
                                                    <span className="capitalize">
                                                        {housingOwner.rawAddress.map((_, i) =>
                                                            <span style={{ display: 'block' }}
                                                                  key={housingId + '_address_' + i}>{capitalize(_)}</span>)
                                                        }
                                                    </span>
                                                </span>
                                        </Text>
                                    </Col>
                                    <Col className="align-right">
                                        <Link title="Accéder à la fiche du propriétaire" to={(location.pathname.indexOf('proprietaires') === -1 ? location.pathname : '') + '/proprietaires/' + housingOwner.id} className="ds-fr--inline fr-link">
                                            Accéder à la fiche du propriétaire<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                                        </Link>
                                    </Col>
                                </Row>
                            )}
                        </div>
                    }
                </Container>
            </>}
        </>
    );
};

export default HousingView;

