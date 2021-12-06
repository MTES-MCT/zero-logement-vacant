import React, { useEffect, useState } from 'react';

import { Alert, Button, Col, Container, Row, Title } from '@dataesr/react-dsfr';
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
import { useHistory, useLocation } from 'react-router-dom';
import { SelectedHousing } from '../../models/Housing';

const HousingListView = () => {

    const dispatch = useDispatch();
    const history = useHistory();
    const { search } = useLocation();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createAlert, setCreateAlert] = useState(false);
    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});

    const { paginatedHousing, filters } = useSelector((state: ApplicationState) => state.housing);
    const { campaignFetchingId } = useSelector((state: ApplicationState) => state.campaign);


    useEffect(() => {
        dispatch(changeHousingFiltering(filters))
    }, [dispatch])

    useEffect(() => {
        if (campaignFetchingId) {
            history.push(`/campagnes/${campaignFetchingId}`);
        }
    }, [campaignFetchingId])

    const create = () => {
        if (!selectedHousing.all && selectedHousing?.ids.length === 0) {
            setCreateAlert(true)
        } else {
            setCreateAlert(false)
            setIsCreateModalOpen(true)
        }
    }

    const onSubmitDraftCampaign = (draftCampaign: DraftCampaign) => {
        dispatch(createCampaign(draftCampaign, selectedHousing.all, selectedHousing.ids))
    }

    const onSelectHousing = (selectedHousing: SelectedHousing) => {
        if (selectedHousing.all || selectedHousing?.ids.length !== 0) {
            setCreateAlert(false)
        }
        setSelectedHousing(selectedHousing)
    }

    const removeFilter = (removedFilter: any) => {
        dispatch(changeHousingFiltering({
            ...filters,
            ...removedFilter,
        }));
    }

    const searchWithQuery = (query: string) => {
        dispatch(changeHousingFiltering({
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
                            <AppSearchBar onSearch={searchWithQuery} />
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
                        { (new URLSearchParams(search)).get('campagne') &&
                        <Alert title="Création d’une campagne"
                               description="Pour créer une nouvelle campagne, sélectionnez les propriétaires que vous souhaitez cibler, puis cliquez sur le bouton “créer la campagne”."
                               className="fr-mb-3w"
                               closable/>
                        }

                        { createAlert &&
                        <Alert title=""
                               description="Vous devez sélectionner au moins un logement pour créer une campagne."
                               className="fr-my-3w"
                               type="error"
                               data-testid="no-housing-alert"
                               closable/>
                        }
                        <Row alignItems="middle" className="fr-pb-1w">
                            <Col>
                                <b>{paginatedHousing.totalCount} logements </b>
                            </Col>
                            <Col>
                                <Button title="Créer la campagne"
                                        onClick={() => create()}
                                        data-testid="create-campaign-button"
                                        className="float-right">
                                    Créer la campagne
                                </Button>
                                {isCreateModalOpen &&
                                <CampaignCreationModal housingCount={selectedHousing.all ? paginatedHousing.totalCount - selectedHousing.ids.length : selectedHousing.ids.length}
                                                       onSubmit={(draftCampaign: DraftCampaign) => onSubmitDraftCampaign(draftCampaign)}
                                                       onClose={() => setIsCreateModalOpen(false)}/>}
                            </Col>
                        </Row>
                        <HousingList paginatedHousing={paginatedHousing}
                                     onChangePagination={(page, perPage) => dispatch(changeHousingPagination(page, perPage))}
                                     filters={filters}
                                     displayKind={HousingDisplayKey.Housing}
                                     onSelectHousing={onSelectHousing}/>
                    </>
                }
            </Container>
        </>
    );
};

export default HousingListView;

