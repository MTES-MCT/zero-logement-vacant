import React, { useEffect, useState } from 'react';

import { Button, Col, Container, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilter from './HousingListFilter';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { changeHousingFiltering, changeHousingPagination } from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { DraftCampaign } from '../../models/Campaign';
import { useHistory } from 'react-router-dom';
import { SelectedHousing } from '../../models/Housing';


const HousingListView = () => {

    const dispatch = useDispatch();
    const history = useHistory();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});

    const { paginatedHousing, filters } = useSelector((state: ApplicationState) => state.housing);
    const { campaignFetchingId } = useSelector((state: ApplicationState) => state.campaign);

    const create = (draftCampaign: DraftCampaign) => {
        dispatch(createCampaign(draftCampaign, selectedHousing.all, selectedHousing.ids))
    }

    const removeFilter = (removedFilter: any) => {
        dispatch(changeHousingFiltering({
            ...filters,
            ...removedFilter,
        }));
    }

    const search = (query: string) => {
        dispatch(changeHousingFiltering({
            ...filters,
            query
        }));
    }

    useEffect(() => {
        dispatch(changeHousingFiltering(filters))
    }, [dispatch])

    useEffect(() => {
        if (campaignFetchingId) {
            history.push(`/campagnes/${campaignFetchingId}`);
        }
    }, [campaignFetchingId])


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
                {paginatedHousing &&
                    <>
                        <Row alignItems="middle" className="fr-pb-1w">
                            <Col>
                                <b>{paginatedHousing.totalCount} logements </b>
                            </Col>
                            <Col>
                                <Button title="Créer la campagne"
                                        onClick={() => setIsModalOpen(true)}
                                        data-testid="create-campaign-button"
                                        disabled={!selectedHousing.all && selectedHousing?.ids.length === 0}
                                        className="float-right">
                                    Créer la campagne
                                </Button>
                                {isModalOpen &&
                                <CampaignCreationModal housingCount={selectedHousing.all ? paginatedHousing.totalCount - selectedHousing.ids.length : selectedHousing.ids.length}
                                                       onSubmit={(draftCampaign: DraftCampaign) => create(draftCampaign)}
                                                       onClose={() => setIsModalOpen(false)}/>}
                            </Col>
                        </Row>
                        <HousingList paginatedHousing={paginatedHousing}
                                     onChangePagination={(page, perPage) => dispatch(changeHousingPagination(page, perPage))}
                                     filters={filters}
                                     displayKind={HousingDisplayKey.Housing}
                                     onSelectHousing={(selectedHousing: SelectedHousing) => setSelectedHousing(selectedHousing)}/>
                    </>
                }
            </Container>
        </>
    );
};

export default HousingListView;

