import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Row, Tab, Tabs, Text } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
    changeCampaignHousingPagination,
    createCampaignReminder,
    listCampaignHousing,
    removeCampaignHousingList,
    updateCampaignHousingList,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { Housing, HousingUpdate, SelectedHousing, selectedHousingCount } from '../../models/Housing';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import HousingStatusModal from '../../components/modals/HousingStatusModal/HousingStatusModal';
import {
    HousingStatus,
    getHousingState,
    getPrecision,
    getSubStatus,
} from '../../models/HousingState';
import { displayCount } from '../../utils/stringUtils';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import HousingListStatusModal
    from '../../components/modals/HousingStatusModal/HousingListStatusModal';
import CampaignReminderCreationModal
    from '../../components/modals/CampaignReminderCreationModal/CampaignReminderCreationModal';

const TabContent = ({ status } : { status: HousingStatus }) => {

    const dispatch = useDispatch();

    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});
    const [updatingModalHousing, setUpdatingModalHousing] = useState<Housing | undefined>();
    const [updatingModalSelectedHousing, setUpdatingModalSelectedHousing] = useState<SelectedHousing | undefined>();
    const [reminderModalSelectedHousing, setReminderModalSelectedHousing] = useState<SelectedHousing | undefined>();
    const [isRemovingModalOpen, setIsRemovingModalOpen] = useState<boolean>(false);
    const [actionAlert, setActionAlert] = useState(false);

    const { campaignHousingByStatus, campaign } = useSelector((state: ApplicationState) => state.campaign);

    if (!campaign) {
        return <></>
    }

    const paginatedCampaignHousing = campaignHousingByStatus[status];

    const selectedCount = selectedHousingCount(selectedHousing, paginatedCampaignHousing.totalCount)

    const menuActions = [
        { title: 'Changer le statut', selectedHousing, onClick: () => setUpdatingModalSelectedHousing(selectedHousing) },
        { title: 'Supprimer', selectedHousing, onClick: () => setIsRemovingModalOpen(true)}
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
        render: ({ status, subStatus, precision } : Housing) =>
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
                {status && subStatus && precision &&
                    <div style={{
                        backgroundColor: `var(${getPrecision(status, subStatus, precision)?.bgcolor})`,
                        color: `var(${getPrecision(status, subStatus, precision)?.color})`,
                    }}
                          className='status-label'>
                                {precision}
                            </div>
                }
            </>
    };

    const submitHousingUpdate = (housingId: string, housingUpdate: HousingUpdate) => {
        dispatch(updateCampaignHousingList(housingUpdate, false, [housingId]))
        setUpdatingModalHousing(undefined)
    }

    const submitSelectedHousingUpdate = (updated: HousingUpdate) => {
        dispatch(updateCampaignHousingList({...updated, campaignId: campaign.id}, selectedHousing.all, selectedHousing.ids))
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
        dispatch(createCampaignReminder(campaign, startMonth, selectedHousing.all, selectedHousing.ids))
    }

    return (
        <>
            {!paginatedCampaignHousing.loading && <>
                <b>{displayCount(paginatedCampaignHousing.totalCount, 'logement')}</b>

                <Row alignItems="middle">
                    {paginatedCampaignHousing.totalCount > 0 &&
                        <Col>
                            <AppActionsMenu actions={menuActions}/>
                        </Col>
                    }
                    {status === HousingStatus.Waiting && campaign.campaignNumber > 0 &&
                        <Col>
                            <Button title="Créer une relance"
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
                        initialCampaign={campaign}
                        onSubmit={(startMonth: string) => submitCampaignReminder(startMonth)}
                        onClose={() => setReminderModalSelectedHousing(undefined)}/>
                }
                {isRemovingModalOpen &&
                    <ConfirmationModal
                        onSubmit={() => {
                            dispatch(removeCampaignHousingList(campaign.id, selectedHousing.all, selectedHousing.ids, status))
                            setIsRemovingModalOpen(false);
                        }}
                        onClose={() => setIsRemovingModalOpen(false)}>
                        <Text size="md" className="fr-mb-0">
                            Êtes-vous sûr de vouloir supprimer {selectedCount === 1 ? 'ce logement' : `ces ${selectedCount} logements de cette campagne`} ?
                        </Text>
                    </ConfirmationModal>
                }
            </>}
        </>
    )
}



const CampaignInProgress = () => {

    const dispatch = useDispatch();

    const { campaignHousingByStatus, campaign } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        if (campaign) {
            dispatch(listCampaignHousing(campaign.id, HousingStatus.Waiting))
            dispatch(listCampaignHousing(campaign.id, HousingStatus.InProgress))
            dispatch(listCampaignHousing(campaign.id, HousingStatus.NoAction))
            dispatch(listCampaignHousing(campaign.id, HousingStatus.NotVacant))
            dispatch(listCampaignHousing(campaign.id, HousingStatus.Exit))
        }
    }, [dispatch])

    const getTabLabel = (status: HousingStatus) => {
        return `${getHousingState(status).title} (${campaignHousingByStatus[status].loading ? '...' : campaignHousingByStatus[status].totalCount})`
    }

    return (
        <Tabs>
            <Tab label={getTabLabel(HousingStatus.Waiting)}>
                <TabContent status={HousingStatus.Waiting}/>
            </Tab>
            <Tab label={getTabLabel(HousingStatus.InProgress)}>
                <TabContent status={HousingStatus.InProgress}/>
            </Tab>
            <Tab label={getTabLabel(HousingStatus.NotVacant)}>
                <TabContent status={HousingStatus.NotVacant}/>
            </Tab>
            <Tab label={getTabLabel(HousingStatus.NoAction)}>
                <TabContent status={HousingStatus.NoAction}/>
            </Tab>
            <Tab label={getTabLabel(HousingStatus.Exit)}>
                <TabContent status={HousingStatus.Exit}/>
            </Tab>
        </Tabs>
    );
};

export default CampaignInProgress;

