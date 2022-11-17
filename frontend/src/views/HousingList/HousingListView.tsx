import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Col,
    Container,
    Row,
    Text,
    Title
} from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilter from './HousingListFilter';
import HousingList, {
    HousingDisplayKey
} from '../../components/HousingList/HousingList';
import {
    changeHousingFiltering,
    changeHousingPagination
} from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal
    from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import HousingFiltersBadges
    from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { CampaignKinds } from '../../models/Campaign';
import { useLocation } from 'react-router-dom';
import { SelectedHousing, selectedHousingCount } from '../../models/Housing';
import { initialHousingFilters } from '../../store/reducers/housingReducer';
import housingService from '../../services/housing.service';
import { format } from 'date-fns';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import {
    TrackEventActions,
    TrackEventCategories
} from '../../models/TrackEvent';
import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import HousingListHeader from "../../components/HousingList/HousingListHeader";
import HousingListHeaderActions
    from "../../components/HousingList/HousingListHeaderActions";

const HousingListView = () => {

    const dispatch = useDispatch();
    const { search } = useLocation();
    const { trackEvent } = useMatomo();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [noHousingAlert, setNoHousingAlert] = useState(false);
    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});

    function hasSelected(): boolean {
        return selectedHousing.all || selectedHousing.ids.length > 0
    }

    const { paginatedHousing, filters } = useSelector((state: ApplicationState) => state.housing);

    useEffect(() => {
        const query = (new URLSearchParams(search)).get('q')
        if (query) {
            dispatch(changeHousingFiltering({ ...initialHousingFilters, query }))
        } else {
            dispatch(changeHousingFiltering(filters))
        }
    }, [search, dispatch]) //eslint-disable-line react-hooks/exhaustive-deps

    const create = () => {
        trackEvent({
            category: TrackEventCategories.HousingList,
            action: TrackEventActions.HousingList.CreateCampaign,
            value: selectedHousingCount(selectedHousing, paginatedHousing.totalCount)
        })
        if (!selectedHousing.all && selectedHousing?.ids.length === 0) {
            setNoHousingAlert(true)
        } else {
            setNoHousingAlert(false)
            setIsCreateModalOpen(true)
        }
    }

    const exportHousing = () => {
        trackEvent({
            category: TrackEventCategories.HousingList,
            action: TrackEventActions.HousingList.Export,
            value: selectedHousingCount(selectedHousing, paginatedHousing.totalCount)
        })
        if (!selectedHousing.all && selectedHousing?.ids.length === 0) {
            setNoHousingAlert(true)
        } else {
            setNoHousingAlert(false)
            dispatch(showLoading());
            housingService.exportHousing(filters, selectedHousing.all, selectedHousing.ids)
                .then((response) => {
                    const link = document.createElement("a");
                    link.href = window.URL.createObjectURL(response);
                    link.download = `export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

                    document.body.appendChild(link);

                    link.click();
                    setTimeout(function() {
                        dispatch(hideLoading());
                        window.URL.revokeObjectURL(link.href);
                    }, 200);
                });
        }
    }

    const onSubmitCampaignCreation = (campaignTitle?: string) => {
        if (campaignTitle) {
            trackEvent({
                category: TrackEventCategories.HousingList,
                action: TrackEventActions.HousingList.SaveCampaign,
                value: selectedHousingCount(selectedHousing, paginatedHousing.totalCount)
            })
            dispatch(createCampaign(
                {
                    kind: CampaignKinds.Initial,
                    filters,
                    title: campaignTitle
                },
                selectedHousing.all,
                selectedHousing.ids)
            )
        }
    }

    const onSelectHousing = (selectedHousing: SelectedHousing) => {
        if (selectedHousing.all || selectedHousing?.ids.length !== 0) {
            setNoHousingAlert(false)
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
        trackEvent({
            category: TrackEventCategories.HousingList,
            action: TrackEventActions.HousingList.Search
        });
        dispatch(changeHousingFiltering({
            ...filters,
            query
        }));
        return Promise.resolve()
    }


    return (
        <>
            <div className="bg-100">
                <Container spacing="py-4w">
                    <AppBreadcrumb />
                    <Row>
                        <Col n="8">
                            <Title as="h1">Base de données</Title>
                            <Text size="lead" className="subtitle">
                                Explorez les logements vacants de votre
                                territoire et créez vos échantillons de
                                logements à mobiliser à partir des filtres
                                présents ci-dessous.
                            </Text>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="py-4w">
                <Row>
                    <HousingListFilter />
                    <HousingFiltersBadges filters={filters} onChange={(values) => removeFilter(values)} />
                </Row>
            </Container>
            <Container spacing="py-4w mb-4w">
                {paginatedHousing &&
                    <>
                        { (new URLSearchParams(search)).get('campagne') &&
                        <Alert title="Création d’une campagne"
                               description="Pour créer une nouvelle campagne, sélectionnez les propriétaires que vous souhaitez cibler, puis cliquez sur le bouton “créer la campagne”."
                               className="fr-my-3w"
                               closable/>
                        }

                        { noHousingAlert &&
                        <Alert title=""
                               description="Vous devez sélectionner au moins un logement."
                               className="fr-my-3w"
                               type="error"
                               data-testid="no-housing-alert"
                               closable/>
                        }
                        {!hasSelected() &&
                          <Notice
                            title="Sélectionnez les logements que vous souhaitez cibler, puis cliquez sur Créer la campagne ou sur Exporter"/>
                        }
                        <HousingList paginatedHousing={paginatedHousing}
                                     onChangePagination={(page, perPage) => dispatch(changeHousingPagination(page, perPage))}
                                     filters={filters}
                                     displayKind={HousingDisplayKey.Housing}
                                     onSelectHousing={onSelectHousing}
                        >
                            <HousingListHeader>
                                <HousingListHeaderActions>
                                    {paginatedHousing.totalCount > 0 &&
                                      <Row justifyContent="right">
                                          {!hasSelected() &&
                                            <Col>
                                                <AppSearchBar
                                                  onSearch={searchWithQuery}
                                                  initialQuery={filters.query}/>
                                            </Col>
                                          }
                                          <Button title="Exporter"
                                                  secondary
                                                  onClick={() => exportHousing()}
                                                  data-testid="export-campaign-button"
                                                  className="fr-mx-2w">
                                              Exporter (.csv)
                                          </Button>
                                          <Button title="Créer la campagne"
                                                  onClick={() => create()}
                                                  data-testid="create-campaign-button">
                                              Créer la campagne
                                          </Button>
                                          {isCreateModalOpen &&
                                            <CampaignCreationModal
                                              housingCount={selectedHousingCount(selectedHousing, paginatedHousing.totalCount)}
                                              filters={filters}
                                              housingExcudedCount={paginatedHousing.totalCount - selectedHousingCount(selectedHousing, paginatedHousing.totalCount)}
                                              onSubmit={(campaignTitle?: string) => onSubmitCampaignCreation(campaignTitle)}
                                              onClose={() => setIsCreateModalOpen(false)}/>
                                          }
                                      </Row>
                                    }
                                </HousingListHeaderActions>
                            </HousingListHeader>
                        </HousingList>
                    </>
                }
            </Container>
        </>
    );
};

export default HousingListView;

