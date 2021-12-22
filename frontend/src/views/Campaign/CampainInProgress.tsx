import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Row, Tab, Tabs } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
    changeCampaignHousingPagination,
    listCampaignHousing,
    updateCampaignHousingList,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { CampaignHousing, SelectedHousing } from '../../models/Housing';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import CampaignStatusUpdatingModal
    from '../../components/modals/CampaignStatusUpdatingModal/CampaignStatusUpdatingModal';
import { CampaignHousingStatus, getCampaignHousingState } from '../../models/CampaignHousingState';
import { displayCount } from '../../utils/stringUtils';

const TabContent = ({ status } : { status: CampaignHousingStatus }) => {

    const dispatch = useDispatch();

    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});
    const [actionAlert, setActionAlert] = useState(false);
    const [updatingModalCampaignHousing, setUpdatingModalCampaignHousing] = useState<CampaignHousing | undefined>();
    const [updatingModalSelectedHousing, setUpdatingModalSelectedHousing] = useState<SelectedHousing | undefined>();

    const { campaignHousingByStatus, campaign } = useSelector((state: ApplicationState) => state.campaign);

    const paginatedCampaignHousing = campaignHousingByStatus[status];

    const menuActions = [
        {
            title: 'Changer le statut', onClick: () => {
                if (!selectedHousing.all && selectedHousing?.ids.length === 0) {
                    setActionAlert(true)
                } else {
                    setActionAlert(false)
                    setUpdatingModalSelectedHousing(selectedHousing)
                }
            }
        },
        {title: 'Supprimer', onClick: () => {console.log('supprimer')}}
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
            {!paginatedCampaignHousing.loading && <>
                <Row alignItems="middle" className="fr-pb-1w">
                    <Col>
                        <b>{displayCount(paginatedCampaignHousing.totalCount, 'logement')}</b>
                    </Col>
                </Row>
                {paginatedCampaignHousing.totalCount > 0 && <>
                    { actionAlert &&
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
                </> }
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
                        dispatch(updateCampaignHousingList(campaign!.id, campaignHousingUpdate, false, [updatingModalCampaignHousing?.id]))
                        setUpdatingModalCampaignHousing(undefined);
                    }}
                    onClose={() => setUpdatingModalCampaignHousing(undefined)}/>
            }
            {updatingModalSelectedHousing &&
                <CampaignStatusUpdatingModal
                    housingCount={selectedHousing.all ? paginatedCampaignHousing.totalCount - selectedHousing.ids.length : selectedHousing.ids.length}
                    initialStatus={status}
                    onSubmit={(campaignHousingUpdate) => {
                        dispatch(updateCampaignHousingList(campaign!.id, campaignHousingUpdate, selectedHousing.all, selectedHousing.ids))
                        setUpdatingModalSelectedHousing(undefined);
                    }}
                    onClose={() => setUpdatingModalSelectedHousing(undefined)}/>
            }
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

