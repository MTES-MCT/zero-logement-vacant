import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Row, Tab, Tabs, Text } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
    changeCampaignHousingPagination,
    createCampaignBundleReminder,
    listCampaignBundleHousing,
    updateCampaignHousingList,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { Housing, HousingUpdate, SelectedHousing, selectedHousingCount } from '../../models/Housing';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import HousingStatusModal from '../../components/modals/HousingStatusModal/HousingStatusModal';
import { getHousingState, getSubStatus, HousingStatus } from '../../models/HousingState';
import { displayCount } from '../../utils/stringUtils';
import HousingListStatusModal from '../../components/modals/HousingStatusModal/HousingListStatusModal';
import CampaignReminderCreationModal
    from '../../components/modals/CampaignReminderCreationModal/CampaignReminderCreationModal';

const TabContent = ({ status } : { status: HousingStatus }) => {

    const dispatch = useDispatch();

    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});
    const [updatingModalHousing, setUpdatingModalHousing] = useState<Housing | undefined>();
    const [updatingModalSelectedHousing, setUpdatingModalSelectedHousing] = useState<SelectedHousing | undefined>();
    const [reminderModalSelectedHousing, setReminderModalSelectedHousing] = useState<SelectedHousing | undefined>();
    const [actionAlert, setActionAlert] = useState(false);

    const { campaignBundleHousingByStatus, campaignBundle } = useSelector((state: ApplicationState) => state.campaign);

    if (!campaignBundle) {
        return <></>
    }

    const paginatedCampaignHousing = campaignBundleHousingByStatus[status];

    const selectedCount = selectedHousingCount(selectedHousing, paginatedCampaignHousing.totalCount)

    const menuActions = [
        { title: 'Changer le statut', selectedHousing, onClick: () => setUpdatingModalSelectedHousing(selectedHousing) }
    ] as MenuAction[]

    const modifyColumn = {
        name: 'modify',
        headerRender: () => '',
        render: (housing: Housing) =>
            <>
                <Button title="Mettre à jour"
                        size="sm"
                        secondary
                        onClick={() => setUpdatingModalHousing(housing)}>
                    Mettre à jour &nbsp;<span className="fr-fi-edit-fill" aria-hidden="true" />
                </Button>
            </>
    }

    const statusColumn = {
        name: 'status',
        label: 'Statut',
        render: ({ status, subStatus } : Housing) =>
            <>
                {status &&
                    <div style={{
                        backgroundColor: `var(${getHousingState(status).bgcolor})`,
                        color: `var(${getHousingState(status).color})`,
                    }}
                         className='status-label'>
                        {getHousingState(status).title}
                    </div>
                }
                {status && subStatus && subStatus !== getHousingState(status).title &&
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
        dispatch(updateCampaignHousingList(housingUpdate, status, false, [housing.id]))
        setUpdatingModalHousing(undefined)
    }

    const submitSelectedHousingUpdate = (housingUpdate: HousingUpdate) => {
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

    const submitCampaignReminder = (startMonth: string) => {
        dispatch(createCampaignBundleReminder(startMonth, selectedHousing.all, selectedHousing.ids))
    }

    return (
        <>
            {!paginatedCampaignHousing.loading && <>
                <b>{displayCount(paginatedCampaignHousing.totalCount, 'logement')}</b>

                <Row alignItems="middle" className="fr-pb-2w">
                    {paginatedCampaignHousing.totalCount > 0 &&
                        <Col>
                            <AppActionsMenu actions={menuActions}/>
                        </Col>
                    }
                    {status === HousingStatus.Waiting && (campaignBundle.campaignNumber ?? 0) > 0 &&
                        <Col>
                            <Button title="Créer une campagne de relance"
                                    className="float-right"
                                    onClick={handleCampaignReminder}>
                                Créer une campagne de relance
                            </Button>
                        </Col>
                    }
                </Row>
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
                             displayKind={HousingDisplayKey.Owner}
                             onSelectHousing={(selectedHousing: SelectedHousing) => setSelectedHousing(selectedHousing)}
                             additionalColumns={[statusColumn, modifyColumn]}
                             tableClassName="campaign"/>
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
                        onSubmit={campaignHousingUpdate => submitSelectedHousingUpdate(campaignHousingUpdate)}
                        onClose={() => setUpdatingModalSelectedHousing(undefined)}/>
                }
                {reminderModalSelectedHousing &&
                    <CampaignReminderCreationModal
                        housingCount={selectedCount}
                        filters={campaignBundle.filters}
                        onSubmit={(startMonth: string) => submitCampaignReminder(startMonth)}
                        onClose={() => setReminderModalSelectedHousing(undefined)}/>
                }
            </>}
        </>
    )
}



const CampaignInProgress = ({ query } : { query?: string }) => {

    const dispatch = useDispatch();

    const { campaignBundleHousingByStatus, campaignBundle } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        if (campaignBundle) {
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.Waiting, query))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.FirstContact, query))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.InProgress, query))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.NoAction, query))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.NotVacant, query))
            dispatch(listCampaignBundleHousing(campaignBundle, HousingStatus.Exit, query))
        }
    }, [dispatch, query, campaignBundle])

    const getTabLabel = (status: HousingStatus) => {
        return `${getHousingState(status).title} (${campaignBundleHousingByStatus[status].loading ? '...' : campaignBundleHousingByStatus[status].totalCount})`
    }

    return (
        <Tabs className="campaignTabs">
            <Tab label={getTabLabel(HousingStatus.Waiting)}>
                <Text>
                    Le propriétaire n’a pas répondu.
                </Text>
                <TabContent status={HousingStatus.Waiting}/>
            </Tab>
            <Tab label={getTabLabel(HousingStatus.FirstContact)}>
                <Text>
                    Il y a eu un retour ou un échange avec le propriétaire.
                </Text>
                <TabContent status={HousingStatus.FirstContact}/>
            </Tab>
            <Tab label={getTabLabel(HousingStatus.InProgress)}>
                <Text>
                    La vacance du bien est confirmée et celui-ci fait l’objet d’un projet de travaux, d’une vente en cours ou est accompagné par un partenaire pour une remise sur le marché.
                </Text>
                <TabContent status={HousingStatus.InProgress}/>
            </Tab>
            <Tab label={getTabLabel(HousingStatus.Exit)}>
                <Text>
                    Le bien était vacant dans les 2 dernières années et est sorti de la vacance avec ou sans accompagnement (à renseigner dans sous-statut).
                </Text>
                <TabContent status={HousingStatus.Exit}/>
            </Tab>
            <Tab label={getTabLabel(HousingStatus.NotVacant)}>
                <Text>
                    Le propriétaire (ou un acteur de terrain) a indiqué que le bien n’a jamais été vacant ou qu’il a été vendu ou loué il y a plus de 2 ans.
                    <br />Retour traduisant une erreur dans la base de données.
                </Text>
                <TabContent status={HousingStatus.NotVacant}/>
            </Tab>
            <Tab label={getTabLabel(HousingStatus.NoAction)}>
                <Text>
                    La vacance du bien est confirmée mais la situation est complexe et le propriétaire ne semble pas être dans une dynamique de sortie de vacance.
                </Text>
                <TabContent status={HousingStatus.NoAction}/>
            </Tab>
        </Tabs>
    );
};

export default CampaignInProgress;

