import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Col, Container, Link, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from './owner.module.scss';
import { differenceInYears, format, isValid } from 'date-fns';
import { capitalize } from '../../utils/stringUtils';
import {
    getOwner,
    getOwnerCampaignHousing,
    getOwnerHousing,
    update,
    updateOwnerCampaignHousing,
} from '../../store/actions/ownerAction';
import { Owner } from '../../models/Owner';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import OwnerEvents from './OwnerEvents';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import classNames from 'classnames';
import config from '../../utils/config';
import CampaignHousingStatusModal from '../../components/modals/CampaignHousingStatusModal/CampaignHousingStatusModal';
import { CampaignHousing, CampaignHousingUpdate } from '../../models/Housing';
import { getCampaign, listCampaigns } from '../../store/actions/campaignAction';
import {
    getCampaignHousingPrecision,
    getCampaignHousingState,
    getCampaignHousingStep,
} from '../../models/CampaignHousingState';

const OwnerView = () => {

    const dispatch = useDispatch();
    const { id, campaignId } = useParams<{id: string, campaignId?: string}>();

    const [isModalOwnerOpen, setIsModalOwnerOpen] = useState(false);
    const [isModalStatusOpen, setIsModalStatusOpen] = useState(false);

    const { owner, housingList, campaignHousingList } = useSelector((state: ApplicationState) => state.owner);
    const { campaignList, campaign } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        dispatch(getOwner(id));
        dispatch(getOwnerHousing(id));
        dispatch(getOwnerCampaignHousing(id));
        if (campaignId && !campaign) {
            dispatch(getCampaign(campaignId))
        }
        if (!campaignList) {
            dispatch(listCampaigns())
        }
    }, [id, dispatch])

    const updateOwner = (owner: Owner) => {
        dispatch(update(owner));
        setIsModalOwnerOpen(false);
    }

    const submitCampaignHousingUpdate = (campaignHousing: CampaignHousing, campaignHousingUpdate: CampaignHousingUpdate) => {
        dispatch(updateOwnerCampaignHousing(campaignHousing.campaignId, campaignHousing.id, campaignHousingUpdate))
        setIsModalStatusOpen(false)
    }

    const campaignHousing = (campaignId: string, housingId: string) =>
        campaignHousingList.find(campaignHousing => campaignHousing.campaignId === campaignId && campaignHousing.id === housingId)!

    return (
        <>
            {owner && housingList && <>
                <div className={styles.titleContainer}>
                    <Container>
                        <AppBreadcrumb additionalItems={[...campaignId && campaign ? [{url: '/campagnes/' + campaignId, label: campaign.name}] : [], {url: '', label: owner.fullName}]}/>
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
                                        <CampaignHousingStatusModal housingList={housingList}
                                                                    campaignHousingList={campaignHousingList}
                                                                    onSubmit={submitCampaignHousingUpdate}
                                                                    onClose={() => setIsModalStatusOpen(false)} />
                                    }
                                </Col>
                            </Row>
                        }
                    </Container>
                </div>
                <Container spacing="py-4w">
                    <Row className="fr-grid-row--center">
                        <Col n="6" className={classNames(styles.bordered, 'fr-py-2w', 'fr-px-3w')}>
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
                                                       onSubmit={(owner: Owner) => updateOwner(owner)}
                                                       onClose={() => setIsModalOwnerOpen(false)} />
                                    }
                                </Col>
                            </Row>
                            <Text size="lg" className="fr-mb-1w">
                                <b>Identité</b>
                            </Text>
                            <hr />
                            <Text size="md" className="fr-mb-1w">
                                <b>Nom :&nbsp;</b>
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
                            <OwnerEvents ownerId={owner.id} />
                        </Col>
                    </Row>
                    {housingList.map((housing, index) =>
                        <div key={housing.id} className={classNames('bg-100','fr-p-3w','fr-my-2w', styles.ownerHousing)}>
                            <Row>
                                <Col n="12">
                                    <Title as="h2" look="h3" className="fr-mb-0">Logement {index + 1}</Title>
                                    <Text size="xs" className="fr-mb-2w">
                                        <b>Invariant fiscal :&nbsp;</b>{housing.invariant}
                                        <br />
                                        <b> {housing.dataYears.length === 1 ? 'Millésime' : 'Millésimes'} :&nbsp;</b>{housing.dataYears.join(' - ')}
                                    </Text>
                                </Col>
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
                                    <div className="fr-mt-2w">
                                        <Link title="Localiser dans Google Map - nouvelle fenêtre"
                                              href={`https://www.google.com/maps/place/${housing.longitude},${housing.latitude}`}
                                              target="_blank">
                                            Localiser
                                        </Link>
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
                                                <Link title="Voir la campagne" href={'/campagnes/' + campaignId} className="ds-fr--inline fr-link">
                                                    Voir la campagne<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                                                </Link>
                                                <div>
                                                    <span style={{
                                                        backgroundColor: `var(${getCampaignHousingState(campaignHousing(campaignId, housing.id).status).bgcolor})`,
                                                        color: `var(${getCampaignHousingState(campaignHousing(campaignId, housing.id).status).color})`,
                                                    }}
                                                          className='status-label'>
                                                        {getCampaignHousingState(campaignHousing(campaignId, housing.id).status).title}
                                                    </span>
                                                    {campaignHousing(campaignId, housing.id).step &&
                                                        <span style={{
                                                            backgroundColor: `var(${getCampaignHousingStep(campaignHousing(campaignId, housing.id))?.bgcolor})`,
                                                            color: `var(${getCampaignHousingStep(campaignHousing(campaignId, housing.id))?.color})`,
                                                        }}
                                                              className='status-label'>
                                                            {campaignHousing(campaignId, housing.id).step}
                                                        </span>
                                                    }
                                                    {campaignHousing(campaignId, housing.id).step && campaignHousing(campaignId, housing.id).precision &&
                                                        <span style={{
                                                            backgroundColor: `var(${getCampaignHousingPrecision(campaignHousing(campaignId, housing.id))?.bgcolor})`,
                                                            color: `var(${getCampaignHousingPrecision(campaignHousing(campaignId, housing.id))?.color})`,
                                                        }}
                                                              className='status-label'>
                                                            {campaignHousing(campaignId, housing.id).precision}
                                                        </span>
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            }
                        </div>
                    )}
                </Container>
            </>}
        </>
    );
};

export default OwnerView;

