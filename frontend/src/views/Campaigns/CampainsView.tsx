import React, { ChangeEvent, useEffect, useState } from 'react';
import { Col, Container, Row, Select, Tab, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { listCampaignHousing, searchCampaign } from '../../store/actions/campaignAction';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import styles from '../Owner/owner.module.scss';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList from '../../components/HousingList/HousingList';


const CampaignsView = () => {

    const dispatch = useDispatch();

    const [campaignId, setCampaignId] = useState<string>();
    const [campaignIdOptions, setCampaignIdOptions] = useState<any[]>([ {value: "", label: "Sélectionner", disabled: true, hidden: true}])

    const { campaignList } = useSelector((state: ApplicationState) => state.campaign);
    const { campaignHousingList } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        setCampaignIdOptions(options => [
            ...options,
            ...campaignList
                .map(c => ({ value: c.id, label: c.name }))
                .sort((c1, c2) => c1.label.localeCompare(c2.label))
        ])
    }, [campaignList])

    useEffect(() => {
        dispatch(searchCampaign(''));
    }, [dispatch])

    useEffect(() => {
        if (campaignId) {
            dispatch(listCampaignHousing(campaignId));
        }
    }, [campaignId, dispatch])

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
                                selected={campaignId}
                                onChange={(e: ChangeEvent<any>) => setCampaignId(e.target.value)}
                                value={campaignId}
                            />
                        </Col>
                        <Col>
                            <Text size="md" className="fr-mb-1w"><b>Caractéristiques de la campagne</b></Text>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="py-4w">
                <Tabs>
                    <Tab label="À contacter">
                        <HousingList housingList={campaignHousingList} />
                    </Tab>
                    <Tab label="En attente de retour">
                    </Tab>
                    <Tab label="Suivi en cours">
                    </Tab>
                    <Tab label="Sans suite">
                    </Tab>
                    <Tab label="Remis sur le marché">
                    </Tab>
                </Tabs>
            </Container>
        </>
    );
};

export default CampaignsView;

