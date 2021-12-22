import React, { useEffect, useState } from 'react';
import { Button, Col, Row, Tab, Tabs } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
    changeCampaignHousingPagination,
    listCampaignHousing,
    updateCampaignHousing,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { CampaignHousing, Housing, SelectedHousing } from '../../models/Housing';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import CampaignStatusUpdatingModal
    from '../../components/modals/CampaignStatusUpdatingModal/CampaignStatusUpdatingModal';
import { CampaignHousingStatus, getCampaignHousingState } from '../../models/CampaignHousingStatus';
import styles from '../../components/HousingList/housing-list.module.scss';

const TabContent = ({ status } : { status: CampaignHousingStatus }) => {

    const dispatch = useDispatch();

    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});
    const [statusUpdatingModalHousing, setStatusUpdatingModalHousing] = useState<Housing | undefined>();

    const { campaignHousingByStatus } = useSelector((state: ApplicationState) => state.campaign);

    const paginatedCampaignHousing = campaignHousingByStatus[status];

    const menuActions = [
        {title: 'Changer le statut', onClick: () => {console.log('change statut')}},
        {title: 'Supprimer', onClick: () => {console.log('supprimer')}}
    ] as MenuAction[]

    const modifyColumn = {
        name: 'modify',
        headerRender: () => '',
        render: (campaignHousing: CampaignHousing) =>
            <>
                <Button title="Mettre à jour"
                        secondary
                        onClick={() => {setStatusUpdatingModalHousing(campaignHousing)}}>
                    Mettre à jour &nbsp;<span className="fr-fi-edit-fill" aria-hidden="true" />
                </Button>
                {statusUpdatingModalHousing?.id === campaignHousing.id &&
                <CampaignStatusUpdatingModal
                    campaignHousing={campaignHousing}
                    onSubmit={(modifiedCampaignHousing) => {
                        dispatch(updateCampaignHousing(modifiedCampaignHousing, campaignHousing.status));
                        setStatusUpdatingModalHousing(undefined);
                    }}
                    onClose={() => setStatusUpdatingModalHousing(undefined)}/>}
            </>
    }

    const statusColumn = {
        name: 'status',
        label: 'Statut',
        render: ({ status, step } : CampaignHousing) =>
            <>
                <div className={styles.statusLabel}>{getCampaignHousingState(status).title}</div>
                {step && <div className={styles.statusLabel}>{step}</div>}
            </>
    };

    return (
        <>
            {!paginatedCampaignHousing.loading && <>
                <Row alignItems="middle" className="fr-pb-1w">
                    <Col>
                        <b>{paginatedCampaignHousing.totalCount} logements </b>
                    </Col>
                </Row>
                <Row>
                    <AppActionsMenu actions={menuActions} />
                </Row>
            </>}
            <HousingList paginatedHousing={paginatedCampaignHousing}
                         onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage, status))}
                         displayKind={HousingDisplayKey.Owner}
                         onSelectHousing={(selectedHousing: SelectedHousing) => setSelectedHousing(selectedHousing)}
                         additionalColumns={[statusColumn, modifyColumn]}/>
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

