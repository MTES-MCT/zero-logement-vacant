import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button, Col, Container, Link as DSFRLink, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from './owner.module.scss';
import { differenceInYears, format, isValid } from 'date-fns';
import { capitalize } from '../../utils/stringUtils';
import { getOwner, getOwnerEvents, getOwnerHousing, update, updateOwnerHousing } from '../../store/actions/ownerAction';
import { Owner } from '../../models/Owner';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import EventsHistory from '../../components/EventsHistory/EventsHistory';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import classNames from 'classnames';
import config from '../../utils/config';
import HousingStatusModal from '../../components/modals/HousingStatusModal/HousingStatusModal';
import { getBuildingLocation, Housing, HousingUpdate } from '../../models/Housing';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import { useCampaignList } from '../../hooks/useCampaignList';
import { getHousingState, getHousingSubStatus, getPrecision } from '../../models/HousingState';
import { campaignBundleIdUrlFragment, campaignName, getCampaignBundleId } from '../../models/Campaign';

const OwnerView = () => {

    const dispatch = useDispatch();
    const location = useLocation();
    const campaignList = useCampaignList();

    const { id, campaignNumber, reminderNumber } = useParams<{id: string, campaignNumber?: string, reminderNumber?: string}>();

    const [isModalOwnerOpen, setIsModalOwnerOpen] = useState(false);
    const [isModalStatusOpen, setIsModalStatusOpen] = useState(false);

    const { owner, housingList, housingTotalCount, events } = useSelector((state: ApplicationState) => state.owner);
    const { campaignBundle } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        dispatch(getOwner(id));
        dispatch(getOwnerHousing(id));
        dispatch(getOwnerEvents(id));
        if (location.pathname.indexOf('campagnes/C') !== -1 && !campaignBundle) {
            dispatch(getCampaignBundle({
                campaignNumber: campaignNumber ? Number(campaignNumber) : undefined,
                reminderNumber: reminderNumber ? Number(reminderNumber) : undefined
            }))
        }
    }, [id, dispatch])

    const updateOwner = (owner: Owner) => {
        dispatch(update(owner));
        setIsModalOwnerOpen(false);
    }

    const submitHousingUpdate = (housing: Housing, housingUpdate: HousingUpdate) => {
        dispatch(updateOwnerHousing(housing, housingUpdate))
        setIsModalStatusOpen(false)
    }

    return (
        <>
            {owner && housingList && <>
                <div className={styles.titleContainer}>
                    <Container>
                        <AppBreadcrumb additionalItems={[
                            ...(location.pathname.indexOf('campagnes/C') !== -1 && campaignBundle ?
                                [{
                                    url: '/campagnes/' + campaignBundleIdUrlFragment(getCampaignBundleId(campaignBundle)),
                                    label: campaignName(campaignBundle.kind, campaignBundle.startMonth, campaignBundle.campaignNumber, campaignBundle.reminderNumber)
                                }] :
                                []),
                            {url: '', label: owner.fullName}
                        ]}/>
                        {owner &&
                            <Row alignItems="middle">
                                <Col>
                                    <Title as="h1" className="fr-py-2w">{owner.fullName}</Title>
                                </Col>
                                <Col>
                                    <Button title="Modifier le dossier"
                                            icon="fr-fi-edit-line"
                                            className="float-right"
                                            onClick={() => {setIsModalStatusOpen(true)}}>
                                        Modifier le dossier
                                    </Button>
                                    {isModalStatusOpen &&
                                        <HousingStatusModal housingList={housingList}
                                                            onSubmit={submitHousingUpdate}
                                                            onClose={() => setIsModalStatusOpen(false)} />
                                    }
                                </Col>
                            </Row>
                        }
                    </Container>
                </div>
                <Container spacing="py-4w">
                    <Row className="fr-grid-row--center">
                        <Col n="6" className="bordered fr-py-2w fr-px-3w">
                            <Row>
                                <Col>
                                    <Title as="h2" look="h3">Propriétaire</Title>
                                </Col>
                                <Col>
                                    <Button title="Modifier le propriétaire"
                                            secondary
                                            size="sm"
                                            icon="fr-fi-edit-line"
                                            className="float-right"
                                            onClick={() => {setIsModalOwnerOpen(true)}}>
                                        Modifier
                                    </Button>
                                    {isModalOwnerOpen &&
                                    <OwnerEditionModal owner={owner}
                                                       onUpdate={updateOwner}
                                                       onClose={() => setIsModalOwnerOpen(false)} />
                                    }
                                </Col>
                            </Row>
                            <Text size="lg" className="fr-mb-1w">
                                <b>Identité</b>
                            </Text>
                            <hr />
                            <Text size="md" className="fr-mb-1w">
                                <b>Nom prénom :&nbsp;</b>
                                <span data-testid="fullName-text">{owner.fullName}</span>
                            </Text>
                            { owner.birthDate && isValid(owner.birthDate) &&
                                <Text size="md" className="fr-mb-1w">
                                    <b>Date de naissance :&nbsp;</b>
                                    <span className="capitalize" data-testid="birthDate-text">{format(owner.birthDate, 'dd/MM/yyyy')}</span>
                                    <span> ({differenceInYears(new Date(), owner.birthDate)} ans)</span>
                                </Text>
                            }

                            <Text size="lg" className="fr-pt-5w fr-mb-1w">
                                <b>Coordonnées</b>
                            </Text>
                            <hr />
                            <Text size="md" className="fr-mb-1w">
                                <span style={{verticalAlign: 'top'}}>
                                    <b>Adresse postale :&nbsp;</b>
                                </span>
                                <span style={{display: 'inline-block'}}>
                                    <span className="capitalize">
                                        {owner.rawAddress.map((_, i) =>
                                            <span style={{display: 'block'}} key={id + '_address_' + i}>{capitalize(_)}</span>)
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
                        </Col>
                        <Col n="6" className="fr-py-2w fr-px-3w">
                            <EventsHistory events={events} housingList={housingList}/>
                        </Col>
                    </Row>
                    {housingList.map((housing, index) =>
                        <div key={housing.id} className={classNames('bg-100','fr-p-3w','fr-my-2w', styles.ownerHousing)}>
                            <Row>
                                <Col>
                                    <Title as="h2" look="h3" className="fr-mb-0">
                                        Logement {index + 1}
                                        {housing.status &&
                                            <span style={{
                                                backgroundColor: `var(${getHousingState(housing.status).bgcolor})`,
                                                color: `var(${getHousingState(housing.status).color})`,
                                            }}
                                                  className='status-label fr-ml-3w'>
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
                                                <span style={{display: 'block'}} key={id + '_address_' + i}>{capitalize(_)}</span>)
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
                                    <Text>
                                        <b>Cause(s) de la vacance :&nbsp;</b>
                                        {housing.vacancyReasons?.map((reason, reasonIdx) =>
                                            <span key={`${housing.id}_${reasonIdx}`}><br />{reason}</span>
                                        )}
                                    </Text>
                                </Col>
                            </Row>
                            {housing.campaignIds.length > 0 &&
                                <Row>
                                    <Col n="12">
                                        <Text size="lg" className="fr-mb-1w">
                                            <b>{housing.campaignIds.length === 1 ? 'Campagne' : 'Campagnes'}</b>
                                        </Text>
                                        <hr/>
                                        {housing.campaignIds.map(campaignId =>
                                            <div key={`${campaignId}_${housing.id}`} className="fr-pb-2w">
                                                <span style={{ verticalAlign: 'top' }}>
                                                    <b>{campaignList?.find(campaign => campaign.id === campaignId)?.name}</b>
                                                </span>
                                                <Link
                                                    title="Voir la campagne"
                                                    to={'/campagnes/' + campaignBundleIdUrlFragment(getCampaignBundleId(campaignList?.find(campaign => campaign.id === campaignId)))}
                                                    className="ds-fr--inline fr-link fr-ml-2w">

                                                    Voir la campagne<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                                                </Link>
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            }
                            <Row>
                                <Col className="align-right">
                                    <Link title="Accéder à la fiche du logement" to={location.pathname + '/logements/' + housing.id} className="ds-fr--inline fr-link">
                                        Accéder à la fiche du logement<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                                    </Link>
                                </Col>
                            </Row>
                        </div>
                    )}
                    {housingTotalCount - housingList.length > 0 &&
                        <div className={classNames('bg-100','fr-p-3w','fr-my-2w', styles.ownerHousing)}>
                            <Row>
                                <Col>
                                    <Title as="h2" look="h3">
                                        {housingTotalCount - housingList.length === 1 ?
                                            'Autre logement' :
                                            'Autres logements'
                                        }
                                    </Title>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Text>
                                        {housingTotalCount - housingList.length === 1 ?
                                            'Ce propriétaire possède un logement qui ne se situe pas dans votre périmètre d’action' :
                                            'Ce propriétaire possède ' + (housingTotalCount - housingList.length) + ' logements qui ne se situent pas dans votre périmètre d’action'
                                        }
                                    </Text>
                                </Col>
                            </Row>
                        </div>
                    }
                </Container>
            </>}
        </>
    );
};

export default OwnerView;

