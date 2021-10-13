import React, { useState } from 'react';

import { Button, Col, Container, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilterMenu from './HousingListFilterMenu';
import HousingList from '../../components/HousingList/HousingList';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { searchHousing } from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal from '../../components/CampaignCreationModal/CampaignCreationModal';


const HousingListView = () => {

    const dispatch = useDispatch();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHousingIds, setSelectedHousingIds] = useState<string[]>([]);

    const { housingList } = useSelector((state: ApplicationState) => state.housing);

    const create = (campaignName: string) => {
        dispatch(createCampaign(campaignName, selectedHousingIds))
        setIsModalOpen(false)
    }

    return (
        <Container spacing="py-4w">
            <Row className="fr-grid-row--center">
                <Col n="3">
                    <HousingListFilterMenu />
                </Col>
                <Col>
                    <Row className="fr-grid-row--middle">
                        <Col n="4">
                            <Title as="h1">Logements</Title>
                        </Col>
                        <Col n="4">
                            <AppSearchBar onSearch={(input: string) => {dispatch(searchHousing(input))}} />
                        </Col>
                        <Col n="4">
                            <div style={{textAlign: 'right'}}>
                                <Button title="open modal"
                                        onClick={() => setIsModalOpen(true)}
                                        data-testid="create-campaign-button"
                                        disabled={selectedHousingIds.length === 0}>
                                    Créer la campagne
                                </Button>
                                {isModalOpen &&
                                <CampaignCreationModal housingCount={selectedHousingIds.length}
                                                       onSubmit={(campaignName: string) => create(campaignName)}
                                                       onClose={() => setIsModalOpen(false)} />}
                            </div>
                        </Col>

                    </Row>
                    <HousingList housingList={housingList} onSelect={(ids: string[]) => setSelectedHousingIds(ids)}/>
                </Col>
            </Row>
        </Container>
    );
};

export default HousingListView;

