import React, { useState } from 'react';

import { Button, Col, Container, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilter from './HousingListFilter';
import HousingList from '../../components/HousingList/HousingList';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { searchHousing } from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import styles from '../Owner/owner.module.scss';


const HousingListView = () => {

    const dispatch = useDispatch();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHousingIds, setSelectedHousingIds] = useState<string[]>([]);

    const { housingList } = useSelector((state: ApplicationState) => state.housing);

    const create = (campaignName: string) => {
        dispatch(createCampaign(campaignName, selectedHousingIds))
        setIsModalOpen(false)
    }

    const getDistinctOwners = () => {return housingList
        .filter(housing => selectedHousingIds.indexOf(housing.id) !== -1)
        .map(housing => housing.ownerId)
        .filter((id, index, array) => array.indexOf(id) === index)
    }

    return (
        <>
            <div className={styles.titleContainer}>
                <Container spacing="py-4w mb-4w">
                    <Row>
                        <Col n="6">
                            <Title as="h1">Base de données</Title>
                        </Col>
                        <Col n="3">
                            <AppSearchBar onSearch={(input: string) => {dispatch(searchHousing(input))}} />
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <HousingListFilter />
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container>
                <Row>
                    <Col className="d-flex fr-grid-row--right">
                        <Button title="Créer la campagne"
                                onClick={() => setIsModalOpen(true)}
                                data-testid="create-campaign-button"
                                disabled={selectedHousingIds.length === 0}>
                            Créer la campagne
                        </Button>
                        {isModalOpen &&
                        <CampaignCreationModal housingCount={selectedHousingIds.length}
                                               ownerCount={getDistinctOwners().length}
                                               onSubmit={(campaignName: string) => create(campaignName)}
                                               onClose={() => setIsModalOpen(false)} />}
                    </Col>
                </Row>
                <HousingList housingList={housingList} onSelect={(ids: string[]) => setSelectedHousingIds(ids)}/>
            </Container>
        </>
    );
};

export default HousingListView;

