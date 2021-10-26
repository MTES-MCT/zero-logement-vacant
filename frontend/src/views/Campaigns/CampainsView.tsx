import React, { ChangeEvent, useEffect, useState } from 'react';
import { Col, Container, Row, Select, Tab, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { listCampaignHousing, searchCampaign, validCampaign } from '../../store/actions/campaignAction';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import styles from '../Owner/owner.module.scss';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { Campaign } from '../../models/Campaign';


const CampaignsView = () => {

    const dispatch = useDispatch();

    const defaultOption = {value: "", label: "Sélectionner", disabled: true, hidden: true};

    const [campaign, setCampaign] = useState<Campaign>();
    const [campaignIdOptions, setCampaignIdOptions] = useState<any[]>([defaultOption])

    const { campaignList, campaignHousingList, exportURL } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        setCampaignIdOptions(options => [
            defaultOption,
            ...campaignList
                .map(c => ({ value: c.id, label: c.name }))
                .sort((c1, c2) => c1.label.localeCompare(c2.label))
        ])
        setCampaign(campaignList.find(_ => _.id === campaign?.id))
    }, [campaignList])

    useEffect(() => {
        dispatch(searchCampaign(''));
    }, [dispatch])

    useEffect(() => {
        if (campaign) {
            dispatch(listCampaignHousing(campaign.id))
        }
    }, [campaign, dispatch])

    const valid = () => {
        if (campaign) {
            dispatch(validCampaign(campaign.id))
        }
    }

    const getDistinctOwners = () => {
        return campaignHousingList?.map(housing => housing.ownerId)
            .filter((id, index, array) => array.indexOf(id) === index)
    }

    return (
        <>
            <div className={styles.titleContainer}>
                <Container spacing="py-4w">
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

            { campaign && !campaign.validatedAt &&
            <Container>
                <div role="alert" className="fr-alert fr-alert--info fr-my-3w">
                    <div className="fr-grid-row fr-grid-row--middle">
                        <div className="fr-col">
                            <div><b>La campagne a bien été créée</b></div>
                            <b>Étape 1 :</b> afin de passer en mode publipostage, merci de valider la liste de  propriétaires.
                        </div>
                        <div className="fr-col-2">
                            <button type="button"
                                    className="fr-btn--sm float-right fr-btn fr-btn--secondary"
                                    onClick={() => valid()}
                                    title="Valider">
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Container>
            }

            {/*{ campaign && !campaign.sentAt &&*/}
            {/*<Container>*/}
            {/*    <div role="alert" className="fr-alert fr-alert--info fr-my-3w">*/}
            {/*        <div className="fr-grid-row fr-grid-row--middle">*/}
            {/*            <div className="fr-col">*/}
            {/*                <div><b>La campagne a bien été créée</b></div>*/}
            {/*                <b>Étape 1 :</b> afin de passer en mode publipostage, merci de valider la liste de  propriétaires.*/}
            {/*            </div>*/}
            {/*            <div className="fr-col-2">*/}
            {/*                <button type="button"*/}
            {/*                        className="fr-btn--sm float-right fr-btn fr-btn--secondary"*/}
            {/*                        onClick={() => valid()}*/}
            {/*                        title="Valider">*/}
            {/*                    Valider*/}
            {/*                </button>*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</Container>*/}
            {/*}*/}

            {campaign && !campaign.validatedAt && campaignHousingList &&
            <Container spacing="py-4w">
                <Tabs>
                    <Tab label={`À valider (${campaignHousingList.length})`}>
                        <HousingList housingList={campaignHousingList} displayKind={HousingDisplayKey.Owner}/>
                    </Tab>
                </Tabs>
            </Container>
            }
        </>
    );
};

export default CampaignsView;

