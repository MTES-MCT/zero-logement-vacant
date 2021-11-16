import React, { useState } from 'react';

import { Button, Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilter from './HousingListFilter';
import HousingList, { HousingDisplayKey, maxRecords } from '../../components/HousingList/HousingList';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { filterHousing, searchHousing } from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { DraftCampaign } from '../../models/Campaign';
import { useHistory } from "react-router-dom";


const HousingListView = () => {

    const dispatch = useDispatch();
    const history = useHistory();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHousingIds, setSelectedHousingIds] = useState<string[]>([]);

    const { housingList, filters } = useSelector((state: ApplicationState) => state.housing);

    const create = (draftCampaign: DraftCampaign) => {
        dispatch(createCampaign(draftCampaign, selectedHousingIds))
        setIsModalOpen(false)
        history.push("/campagnes");
    }

    const getDistinctOwners = () => {return housingList
        .filter(housing => selectedHousingIds.indexOf(housing.id) !== -1)
        .map(housing => housing.ownerId)
        .filter((id, index, array) => array.indexOf(id) === index)
    }

    const removeFilter = (removedFilter: any) => {
        dispatch(filterHousing({
            ...filters,
            ...removedFilter
        }));
    }



    return (
        <>
            <div className="bg-100">
                <Container spacing="pb-1w">
                    <AppBreadcrumb />
                    <Row>
                        <Col n="8">
                            <Title as="h1">Base de données</Title>
                        </Col>
                        <Col n="4">
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
            <Container spacing="pt-2w">
                <Row>
                    <HousingFiltersBadges onChange={(values) => removeFilter(values)} />
                </Row>
                {housingList &&
                    <>
                        <Row alignItems="middle" className="fr-pb-1w">
                            <Col>
                                {housingList.length > 0
                                    ? <Text
                                        className="fr-my-2w"><b>{housingList.length >= maxRecords ? 'Plus de ' + maxRecords : housingList.length}</b> logements</Text>
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
                                                       onSubmit={(draftCampaign: DraftCampaign) => create(draftCampaign)}
                                                       onClose={() => setIsModalOpen(false)}/>}
                            </Col>
                            }
                        </Row>
                        <HousingList housingList={housingList}
                                     displayKind={HousingDisplayKey.Housing}
                                     onSelect={(ids: string[]) => setSelectedHousingIds(ids)}/>
                    </>
                }
            </Container>
        </>
    );
};

export default HousingListView;

