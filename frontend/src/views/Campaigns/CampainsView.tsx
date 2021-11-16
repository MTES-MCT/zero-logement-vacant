import React, { ChangeEvent, useEffect, useState } from 'react';
import { Col, Container, Row, Select, Tab, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { listCampaignHousing, searchCampaign, validCampaignStep } from '../../store/actions/campaignAction';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { Campaign, CampaignSteps } from '../../models/Campaign';
import AppAlert from '../../components/AppAlert/AppAlert';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';


const CampaignsView = () => {

    const dispatch = useDispatch();

    const defaultOption = {value: "", label: "Sélectionner", disabled: true, hidden: true};

    const [campaign, setCampaign] = useState<Campaign>();
    const [campaignIdOptions, setCampaignIdOptions] = useState<any[]>([defaultOption])

    const { campaignList, campaignHousingList, exportURL, campaignId } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        setCampaignIdOptions(() => [
            defaultOption,
            ...campaignList
                .sort((c1, c2) => c1.campaignNumber < c2.campaignNumber ? -1 : c1.campaignNumber === c2.campaignNumber ? 0 : 1)
                .map(c => ({ value: c.id, label: c.name }))
        ])
        setCampaign(campaignList.find(_ => _.id === campaignId ?? campaign?.id))
    }, [campaignList])

    useEffect(() => {
        dispatch(searchCampaign(''));
    }, [dispatch])

    useEffect(() => {
        if (campaign) {
            dispatch(listCampaignHousing(campaign.id))
        }
    }, [campaign?.id, dispatch])

    const validStep = (step: CampaignSteps) => {
        if (campaign) {
            dispatch(validCampaignStep(campaign.id, step))
        }
    }

    const getDistinctOwners = () => {
        return campaignHousingList?.map(housing => housing.ownerId)
            .filter((id, index, array) => array.indexOf(id) === index)
    }

    let campaignAlert;
    if (campaign && !campaign.validatedAt) {
        campaignAlert = <AppAlert
            submitTitle="Valider"
            onSubmit={() => validStep(CampaignSteps.OwnersValidation)}
            content={
                <>
                    <div><b>La campagne a bien été créée</b></div>
                    <b>Étape 1 :</b> afin de passer en mode publipostage, merci de valider la liste de propriétaires.
                </>
            }
        />
    } else if (campaign && !campaign.sentAt) {
        campaignAlert = <AppAlert
            submitTitle="Confirmer"
            onSubmit={() => validStep(CampaignSteps.SendingConfirmation)}
            content={
                <>
                    <div><b>La liste des propriétaires a bien été validée.</b></div>
                    <b>Étape 2 :</b> afin de passer en mode suivi, merci de confirmer que les courriers ont été envoyés.
                </>
            }
        />
    }

    return (
        <>
            <div className="bg-100">
                <Container className="bg-100">
                    <AppBreadcrumb additionalItems={campaign ? [{ url: '', label: campaign.name }] : []}/>
                    <Row>
                        <Col>
                            <Title as="h1">Campagnes</Title>
                        </Col>
                        <Col>
                            <AppSearchBar onSearch={(input: string) => {dispatch(searchCampaign(input))}} />
                        </Col>
                    </Row>
                    <Row>
                        <Col n="3">
                            <Text size="md" className="fr-mb-1w"><b>Sélection</b></Text>
                            <Select
                                label="Nom de la campagne"
                                options={campaignIdOptions}
                                selected={campaign?.id}
                                onChange={(e: ChangeEvent<any>) => setCampaign( campaignList.find(c => c.id === e.target.value))}
                            />
                        </Col>
                        <Col n="3">

                        </Col>
                        { campaign &&
                        <>
                            <Col>
                                <Text size="md" className="fr-mb-1w"><b>Caractéristiques de la campagne</b></Text>
                                <Text size="md" className="fr-mb-1w">
                                    Propriétaires&nbsp;
                                    <b>{getDistinctOwners()?.length}</b>
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    Logements&nbsp;
                                    <b>{campaignHousingList?.length}</b>
                                </Text>
                                <div className="d-flex fr-grid-row--right">
                                    <a href={exportURL} className="fr-btn--md fr-btn" download>
                                        Exporter
                                    </a>
                                </div>
                            </Col>
                        </>
                        }
                    </Row>
                </Container>
            </div>

            { campaignAlert }

            {campaign && campaignHousingList &&
                <Container spacing="py-4w">
                    {!campaign.validatedAt &&
                    <Tabs>
                        <Tab label={`À valider (${campaignHousingList.length})`}>
                            <HousingList housingList={campaignHousingList} displayKind={HousingDisplayKey.Owner}/>
                        </Tab>
                    </Tabs>
                    }
                    {campaign.validatedAt && !campaign.sentAt &&
                    <Tabs>
                        <Tab label={`À confirmer (${campaignHousingList.length})`}>
                            <HousingList housingList={campaignHousingList} displayKind={HousingDisplayKey.Owner}/>
                        </Tab>
                    </Tabs>
                    }
                    {campaign.validatedAt && campaign.sentAt &&
                    <Tabs>
                        <Tab label={`En attente de retour (${campaignHousingList.length})`}>
                            <HousingList housingList={campaignHousingList} displayKind={HousingDisplayKey.Owner}/>
                        </Tab>
                        <Tab label={`Suivi en cours (0)`}>
                            <></>
                        </Tab>
                        <Tab label={`Sans suite (0)`}>
                            <></>
                        </Tab>
                        <Tab label={`Non vacant (0)`}>
                            <></>
                        </Tab>
                        <Tab label={`Sortie de procédure (0)`}>
                            <></>
                        </Tab>
                    </Tabs>
                    }
                </Container>
            }
        </>
    );
};

export default CampaignsView;

