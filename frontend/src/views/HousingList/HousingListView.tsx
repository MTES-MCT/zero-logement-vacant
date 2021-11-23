import React, { useState } from 'react';

import { Button, Col, Container, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilter from './HousingListFilter';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { filterHousing } from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { DraftCampaign } from '../../models/Campaign';
import { useHistory } from 'react-router-dom';


const HousingListView = () => {

    const dispatch = useDispatch();
    const history = useHistory();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHousingIds, setSelectedHousingIds] = useState<string[]>([]);

    const { housingList, filters, totalCount } = useSelector((state: ApplicationState) => state.housing);

    const create = (draftCampaign: DraftCampaign) => {
        dispatch(createCampaign(draftCampaign, selectedHousingIds))
        setIsModalOpen(false)
        history.push("/campagnes");
    }

    const getDistinctOwners = () => {return housingList
        .filter(housing => selectedHousingIds.indexOf(housing.id) !== -1)
        .map(housing => housing.owner.id)
        .filter((id, index, array) => array.indexOf(id) === index)
    }

    const removeFilter = (removedFilter: any) => {
        dispatch(filterHousing({
            ...filters,
            ...removedFilter,
        }));
    }

    const search = (query: string) => {
        dispatch(filterHousing({
            ...filters,
            query
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
                            <AppSearchBar onSearch={search} />
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
                                <b>{totalCount} logements </b>
                            </Col>
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

