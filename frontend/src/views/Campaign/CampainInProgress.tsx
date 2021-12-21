import React, { useState } from 'react';
import { Button, Col, Row, Tab, Tabs } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { changeCampaignHousingPagination, updateCampaignHousing } from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { CampaignHousing, Housing, SelectedHousing } from '../../models/Housing';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import CampaignStatusUpdatingModal from '../../components/modals/CampaignStatusUpdatingModal/CampaignStatusUpdatingModal';


const CampaignInProgress = () => {

    const dispatch = useDispatch();

    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});
    const [statusUpdatingModalHousing, setStatusUpdatingModalHousing] = useState<Housing | undefined>();

    const { paginatedHousing } = useSelector((state: ApplicationState) => state.campaign);

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
                    onSubmit={(ch) => {
                        dispatch(updateCampaignHousing(ch));
                        setStatusUpdatingModalHousing(undefined);
                    }}
                    onClose={() => setStatusUpdatingModalHousing(undefined)}/>}
            </>
    }

    return (
        <Tabs>
            <Tab label={`En attente de retour (${paginatedHousing.loading ? '...' : paginatedHousing.totalCount})`}>
                {!paginatedHousing.loading && <>
                    <Row alignItems="middle" className="fr-pb-1w">
                        <Col>
                            <b>{paginatedHousing.totalCount} logements </b>
                        </Col>
                    </Row>
                    <Row>
                        <AppActionsMenu actions={menuActions} />
                    </Row>
                </>}
                <HousingList paginatedHousing={paginatedHousing}
                             onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage))}
                             displayKind={HousingDisplayKey.Owner}
                             onSelectHousing={(selectedHousing: SelectedHousing) => setSelectedHousing(selectedHousing)}
                             additionalColumns={[modifyColumn]}/>
            </Tab>
            {/*<Tab label="Suivi en cours (0)">*/}
            {/*    TODO*/}
            {/*</Tab>*/}
            {/*<Tab label="Sans suite (0)">*/}
            {/*    TODO*/}
            {/*</Tab>*/}
            {/*<Tab label="Non vacant (0)">*/}
            {/*    TODO*/}
            {/*</Tab>*/}
            {/*<Tab label="Sortie de procédure (0)">*/}
            {/*    TODO*/}
            {/*</Tab>*/}
        </Tabs>
    );
};

export default CampaignInProgress;

