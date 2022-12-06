import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Row, Tabs } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
    changeCampaignHousingPagination, changeCampaignHousingSort,
    createCampaignBundleReminder,
    listCampaignBundleHousing,
    updateCampaignHousingList,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { Housing, HousingSort, HousingUpdate, SelectedHousing, selectedHousingCount } from '../../models/Housing';
import HousingStatusModal from '../../components/modals/HousingStatusModal/HousingStatusModal';
import { getHousingState, getSubStatus, HousingStatus } from '../../models/HousingState';
import HousingListStatusModal from '../../components/modals/HousingStatusModal/HousingListStatusModal';
import { TrackEventActions, TrackEventCategories } from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import Tab from '../../components/Tab/Tab';
import Help from '../../components/Help/Help';
import { Link } from 'react-router-dom';
import HousingListHeaderActions from '../../components/HousingList/HousingListHeaderActions';
import HousingListHeader from '../../components/HousingList/HousingListHeader';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';

const TabContent = ({ status } : { status: HousingStatus }) => {

    const dispatch = useDispatch();
    const { trackEvent } = useMatomo();
    const { isCampaign } = useCampaignBundle()

    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});
    const [updatingModalHousing, setUpdatingModalHousing] = useState<Housing | undefined>();
    const [updatingModalSelectedHousing, setUpdatingModalSelectedHousing] = useState<SelectedHousing | undefined>();
    const [reminderModalSelectedHousing, setReminderModalSelectedHousing] = useState<SelectedHousing | undefined>();
    const [actionAlert, setActionAlert] = useState(false);

    function hasSelected(): boolean {
        return selectedHousing.all || selectedHousing.ids.length > 0
    }

    const { campaignBundleHousingByStatus, campaignBundle } = useSelector((state: ApplicationState) => state.campaign);

    if (!campaignBundle) {
        return <></>
    }

    const paginatedCampaignHousing = campaignBundleHousingByStatus[status];

    const selectedCount = selectedHousingCount(selectedHousing, paginatedCampaignHousing.totalCount)

    const modifyColumn = {
        name: 'modify',
        headerRender: () => '',
        render: (housing: Housing) =>
            <>
                <Button title="Mettre à jour"
                        size="sm"
                        secondary
                        onClick={() => setUpdatingModalHousing(housing)}>
                    Mettre à jour &nbsp;<span className="ri-edit-fill" aria-hidden="true" />
                </Button>
            </>
    }

    const statusColumn = {
        name: 'status',
        label: 'Statut',
        render: ({ status, subStatus } : Housing) =>
            <>
                {status != null &&
                    <div style={{
                        backgroundColor: `var(${getHousingState(status).bgcolor})`,
                        color: `var(${getHousingState(status).color})`,
                    }}
                         className='status-label'>
                        {getHousingState(status).title}
                    </div>
                }
                {status != null && subStatus && subStatus !== getHousingState(status).title &&
                    <div style={{
                        backgroundColor: `var(${getSubStatus(status, subStatus)?.bgcolor})`,
                        color: `var(${getSubStatus(status, subStatus)?.color})`,
                    }}
                         className='status-label'>
                        {subStatus}
                    </div>
                }
            </>
    };

    const submitHousingUpdate = (housing: Housing, housingUpdate: HousingUpdate) => {
        trackEvent({
            category: TrackEventCategories.Campaigns,
            action: TrackEventActions.Campaigns.UpdateHousing,
            value: 1
        })
        dispatch(updateCampaignHousingList(housingUpdate, status, false, [housing.id]))
        setUpdatingModalHousing(undefined)
    }

    const submitSelectedHousingUpdate = (housingUpdate: HousingUpdate) => {
        trackEvent({
            category: TrackEventCategories.Campaigns,
            action: TrackEventActions.Campaigns.UpdateHousing,
            value: selectedHousingCount(selectedHousing, paginatedCampaignHousing.totalCount)
        })
        dispatch(updateCampaignHousingList(housingUpdate, status, selectedHousing.all, selectedHousing.ids))
        setUpdatingModalSelectedHousing(undefined);
    }

    const handleCampaignReminder = () => {
        if (!selectedHousing?.all && selectedHousing?.ids.length === 0) {
            setActionAlert(true);
        } else {
            setActionAlert(false);
            setReminderModalSelectedHousing(selectedHousing)
        }
    }

    const submitCampaignReminder = () => {
        dispatch(createCampaignBundleReminder(campaignBundle.kind, selectedHousing.all, selectedHousing.ids))
    }

    const onSort = (sort: HousingSort) => {
        dispatch(changeCampaignHousingSort(sort, status))
    }

    return (
        <>
            {!hasSelected() &&
                <Row>
                    <Col>
                        <Help>
                            <b>{getHousingState(status).title} : </b>
                            {status === HousingStatus.Waiting ? 'Le propriétaire n’a pas répondu à la campagne.' :
                                status === HousingStatus.FirstContact ? 'Il y a eu un retour ou un échange avec le propriétaire.' :
                                    status === HousingStatus.InProgress ? 'La vacance du bien est confirmée et celui-ci fait l’objet d’un projet de travaux, d’une vente en cours ou est accompagné par un partenaire pour une remise sur le marché.' :
                                        status === HousingStatus.Exit ? 'Le bien était vacant dans les 2 dernières années et est sorti de la vacance avec ou sans accompagnement (à renseigner dans sous-statut).' :
                                            status === HousingStatus.NotVacant ? 'Le propriétaire (ou un acteur de terrain) a indiqué que le bien n’a jamais été vacant ou qu’il a été vendu ou loué il y a plus de 2 ans. Retour traduisant une erreur dans la base de données.' :
                                                status === HousingStatus.NoAction && 'La vacance du bien est confirmée mais la situation est complexe et le propriétaire ne semble pas être dans une dynamique de sortie de vacance.'
                            }
                            <Link to="/ressources" className="float-right">
                                En savoir plus sur les statuts
                            </Link>
                        </Help>
                    </Col>
                    {status === HousingStatus.Waiting && isCampaign &&
                        <Col n="3">
                            <Button title="Créer une campagne de relance"
                                    className="float-right"
                                    onClick={handleCampaignReminder}>
                                Créer une campagne de relance
                            </Button>
                        </Col>
                    }
                </Row>
            }
            {actionAlert &&
                <Alert title=""
                       description="Vous devez sélectionner au moins un logement réaliser cette action."
                       className="fr-my-3w"
                       type="error"
                       onClose={() => setActionAlert(false)}
                       data-testid="no-housing-alert"
                       closable/>
            }
            <HousingList paginatedHousing={paginatedCampaignHousing}
                         onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage, status))}
                         onSort={onSort}
                         displayKind={HousingDisplayKey.Owner}
                         onSelectHousing={(selectedHousing: SelectedHousing) => setSelectedHousing(selectedHousing)}
                         additionalColumns={[statusColumn, modifyColumn]}
                         tableClassName="campaign">
                <HousingListHeader>
                    <HousingListHeaderActions>
                        {hasSelected() &&
                            <Row justifyContent="right">
                                <Button title="Créer une campagne de relance"
                                        secondary
                                        onClick={handleCampaignReminder}
                                        className="fr-mx-2w">
                                    Créer une campagne de relance
                                </Button>
                                <Button title="Mettre à jour le statut"
                                        onClick={() => setUpdatingModalSelectedHousing(selectedHousing)}>
                                    Mettre à jour le statut
                                </Button>
                            </Row>
                        }
                    </HousingListHeaderActions>
                </HousingListHeader>
            </HousingList>
            {updatingModalHousing &&
                <HousingStatusModal
                    housingList={[updatingModalHousing]}
                    onSubmit={submitHousingUpdate}
                    onClose={() => setUpdatingModalHousing(undefined)}/>
            }
            {updatingModalSelectedHousing &&
                <HousingListStatusModal
                    housingCount={selectedCount}
                    initialStatus={status}
                    fromDefaultCampaign={campaignBundle.campaignNumber === 0}
                    onSubmit={campaignHousingUpdate => submitSelectedHousingUpdate(campaignHousingUpdate)}
                    onClose={() => setUpdatingModalSelectedHousing(undefined)}/>
            }
            {reminderModalSelectedHousing &&
                <CampaignCreationModal
                    housingCount={selectedCount}
                    filters={campaignBundle.filters}
                    onSubmit={submitCampaignReminder}
                    onClose={() => setReminderModalSelectedHousing(undefined)}
                    isReminder={true}
                />
            }
        </>
    )
}



const CampaignInProgress = () => {

    const dispatch = useDispatch();

    const { campaignBundleHousingByStatus, campaignBundle } = useSelector((state: ApplicationState) => state.campaign);
    const [searchQuery, setSearchQuery] = useState<string>();

    useEffect(() => {
        if (campaignBundle) {
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.Waiting, searchQuery))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.FirstContact, searchQuery))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.InProgress, searchQuery))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.NoAction, searchQuery))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.NotVacant, searchQuery))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.Exit, searchQuery))
        }
    }, [dispatch, searchQuery]) //eslint-disable-line react-hooks/exhaustive-deps

    const getTabLabel = (status: HousingStatus) => {
        return `${getHousingState(status).title} (${campaignBundleHousingByStatus[status].loading ? '...' : campaignBundleHousingByStatus[status].totalCount})`
    }

    return (
        <>
            <Row spacing="mb-4w">
                <Col n="3">
                    <AppSearchBar onSearch={(input: string) => {setSearchQuery(input)}} />
                </Col>
            </Row>
            {searchQuery &&
                <Row className="fr-pb-2w">
                    <Col>
                        <FilterBadges options={[{value: searchQuery, label: searchQuery}]}
                                      filters={[searchQuery]}
                                      onChange={() => setSearchQuery('')}/>
                    </Col>
                </Row>
            }
            <Tabs className="campaignTabs">
                <Tab label={getTabLabel(HousingStatus.Waiting)}>
                    <TabContent status={HousingStatus.Waiting}/>
                </Tab>
                <Tab label={getTabLabel(HousingStatus.FirstContact)}>
                    <TabContent status={HousingStatus.FirstContact}/>
                </Tab>
                <Tab label={getTabLabel(HousingStatus.InProgress)}>
                    <TabContent status={HousingStatus.InProgress}/>
                </Tab>
                <Tab label={getTabLabel(HousingStatus.Exit)}>
                    <TabContent status={HousingStatus.Exit}/>
                </Tab>
                <Tab label={getTabLabel(HousingStatus.NotVacant)}>
                    <TabContent status={HousingStatus.NotVacant}/>
                </Tab>
                <Tab label={getTabLabel(HousingStatus.NoAction)}>
                    <TabContent status={HousingStatus.NoAction}/>
                </Tab>
            </Tabs>
        </>
    );
};

export default CampaignInProgress;

