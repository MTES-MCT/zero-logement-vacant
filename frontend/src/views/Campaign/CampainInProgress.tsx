import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Row, Tab, Tabs } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
    changeCampaignHousingPagination,
    listCampaignHousing,
    removeCampaignHousingList,
    updateCampaignHousingList,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { CampaignHousing, SelectedHousing, selectedHousingCount } from '../../models/Housing';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import CampaignStatusUpdatingModal
    from '../../components/modals/CampaignStatusUpdatingModal/CampaignStatusUpdatingModal';
import { CampaignHousingStatus, getCampaignHousingState } from '../../models/CampaignHousingState';
import { displayCount } from '../../utils/stringUtils';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';

const TabContent = ({ status } : { status: CampaignHousingStatus }) => {

    const dispatch = useDispatch();

    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});
    const [actionAlert, setActionAlert] = useState(false);
    const [updatingModalCampaignHousing, setUpdatingModalCampaignHousing] = useState<CampaignHousing | undefined>();
    const [updatingModalSelectedHousing, setUpdatingModalSelectedHousing] = useState<SelectedHousing | undefined>();
    const [isRemovingModalOpen, setIsRemovingModalOpen] = useState<boolean>(false);

    const { campaignHousingByStatus, campaign } = useSelector((state: ApplicationState) => state.campaign);

    const paginatedCampaignHousing = campaignHousingByStatus[status];

    const handleAction = (action : (selectedHousing: SelectedHousing) => void) => {
        if (!selectedHousing.all && selectedHousing?.ids.length === 0) {
            setActionAlert(true)
        } else {
            setActionAlert(false)
            action(selectedHousing)
        }
    }

    const selectedCount = selectedHousingCount(selectedHousing, paginatedCampaignHousing.totalCount)

    const menuActions = [
        { title: 'Changer le statut', onClick: () => handleAction(setUpdatingModalSelectedHousing) },
        { title: 'Supprimer', onClick: () => handleAction(() => setIsRemovingModalOpen(true))}
    ] as MenuAction[]

    const modifyColumn = {
        name: 'modify',
        headerRender: () => '',
        render: (campaignHousing: CampaignHousing) =>
            <>
                <Button title="Mettre à jour"
                        secondary
                        onClick={() => setUpdatingModalCampaignHousing(campaignHousing)}>
                    Mettre à jour &nbsp;<span className="fr-fi-edit-fill" aria-hidden="true" />
                </Button>
            </>
    }

    const statusColumn = {
        name: 'status',
        label: 'Statut',
        render: ({ status, step } : CampaignHousing) =>
            <>
                <div className="status-label">{getCampaignHousingState(status).title}</div>
                    {step && step !== getCampaignHousingState(status).title && <div className="status-label">{step}</div>}
            </>
    };

    return (
        <>
            {campaign && <>
                {!paginatedCampaignHousing.loading && <>
                    <Row alignItems="middle" className="fr-pb-1w">
                    <Col>
                    <b>{displayCount(paginatedCampaignHousing.totalCount, 'logement')}</b>
                    </Col>
                    </Row>
                    {paginatedCampaignHousing.totalCount > 0 && <>
                        {actionAlert &&
                        <Alert title=""
                               description="Vous devez sélectionner au moins un logement réaliser cette action."
                               className="fr-my-3w"
                               type="error"
                               data-testid="no-housing-alert"
                               closable/>
                        }
                        <Row>
                            <AppActionsMenu actions={menuActions}/>
                        </Row>
                    </>}
                    </>}
                    <HousingList paginatedHousing={paginatedCampaignHousing}
                    onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage, status))}
                    displayKind={HousingDisplayKey.Owner}
                    onSelectHousing={(selectedHousing: SelectedHousing) => {
                    setSelectedHousing(selectedHousing);
                    setActionAlert(false);
                }}
                    additionalColumns={[statusColumn, modifyColumn]}/>
                {updatingModalCampaignHousing &&
                    <CampaignStatusUpdatingModal
                    campaignHousing={updatingModalCampaignHousing}
                    initialStatus={status}
                    onSubmit={(campaignHousingUpdate) => {
                    dispatch(updateCampaignHousingList(campaign.id, campaignHousingUpdate, false, [updatingModalCampaignHousing?.id]))
                    setUpdatingModalCampaignHousing(undefined);
                }}
                    onClose={() => setUpdatingModalCampaignHousing(undefined)}/>
                }
                {updatingModalSelectedHousing &&
                    <CampaignStatusUpdatingModal
                    housingCount={selectedCount}
                    initialStatus={status}
                    onSubmit={(campaignHousingUpdate) => {
                    dispatch(updateCampaignHousingList(campaign.id, campaignHousingUpdate, selectedHousing.all, selectedHousing.ids))
                    setUpdatingModalSelectedHousing(undefined);
                }}
                    onClose={() => setUpdatingModalSelectedHousing(undefined)}/>
                }
                {isRemovingModalOpen &&
                    <ConfirmationModal
                    content={`Êtes-vous sûr de vouloir supprimer ${selectedCount === 1 ? 'ce logement' : `ces ${selectedCount} logements`} ?`}
                    onSubmit={() => {
                    dispatch(removeCampaignHousingList(campaign.id, selectedHousing.all, selectedHousing.ids, status))
                    setIsRemovingModalOpen(false);
                }}
                    onClose={() => setIsRemovingModalOpen(false)}/>
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
            dispatch(listCampaignHousing(campaign.id, CampaignHousingStatus.Waiting))
            dispatch(listCampaignHousing(campaign.id, CampaignHousingStatus.InProgress))
            dispatch(listCampaignHousing(campaign.id, CampaignHousingStatus.NoAction))
            dispatch(listCampaignHousing(campaign.id, CampaignHousingStatus.NotVacant))
            dispatch(listCampaignHousing(campaign.id, CampaignHousingStatus.Exit))
        }
    }, [dispatch])

    const getTabLabel = (status: CampaignHousingStatus) => {
        return `${getCampaignHousingState(status).title} (${campaignHousingByStatus[status].loading ? '...' : campaignHousingByStatus[status].totalCount})`
    }

    return (
        <Tabs>
            <Tab label={getTabLabel(CampaignHousingStatus.Waiting)}>
                <TabContent status={CampaignHousingStatus.Waiting}/>
            </Tab>
            <Tab label={getTabLabel(CampaignHousingStatus.InProgress)}>
                <TabContent status={CampaignHousingStatus.InProgress}/>
            </Tab>
            <Tab label={getTabLabel(CampaignHousingStatus.NoAction)}>
                <TabContent status={CampaignHousingStatus.NoAction}/>
            </Tab>
            <Tab label={getTabLabel(CampaignHousingStatus.NotVacant)}>
                <TabContent status={CampaignHousingStatus.NotVacant}/>
            </Tab>
            <Tab label={getTabLabel(CampaignHousingStatus.Exit)}>
                <TabContent status={CampaignHousingStatus.Exit}/>
            </Tab>
        </Tabs>
    );
};

export default CampaignInProgress;

