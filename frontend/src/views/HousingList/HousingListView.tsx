import React, { useState } from 'react';

import { Button, Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilter from './HousingListFilter';
import HousingList, { HousingDisplayKey, maxRecords } from '../../components/HousingList/HousingList';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { searchHousing } from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';


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
            <div className="titleContainer">
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
            { housingList &&
            <Container>
                <Row>
                    <Col>
                        { housingList.length > 0
                            ? <Text className="fr-my-2w"><b>{housingList.length >= maxRecords ? 'Plus de ' + maxRecords : housingList.length }</b> logements</Text>
                            : <Text className="fr-my-2w"><b>Aucun logement</b></Text>
                        }
                    </Col>
                    {housingList.length > 0 &&
                    <Col>
                        <Button title="Créer la campagne"
                                onClick={() => setIsModalOpen(true)}
                                data-testid="create-campaign-button"
                                disabled={selectedHousingIds.length === 0}
                                className="float-right">
                            Créer la campagne
                        </Button>
                        {isModalOpen &&
                        <CampaignCreationModal housingCount={selectedHousingIds.length}
                                               ownerCount={getDistinctOwners().length}
                                               onSubmit={(campaignName: string) => create(campaignName)}
                                               onClose={() => setIsModalOpen(false)}/>}
                    </Col>
                    }
                </Row>
                <HousingList housingList={housingList}
                             displayKind={HousingDisplayKey.Housing}
                             onSelect={(ids: string[]) => setSelectedHousingIds(ids)}/>
            </Container>
            }
        </>
    );
};

export default HousingListView;

