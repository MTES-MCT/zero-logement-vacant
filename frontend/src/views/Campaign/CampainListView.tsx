import React, { useEffect, useState } from 'react';
import { Alert, Container, Tab, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { deleteCampaignBundle, listCampaignBundles } from '../../store/actions/campaignAction';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { CampaignBundle } from '../../models/Campaign';
import { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import { useCampaignList } from '../../hooks/useCampaignList';
import CampaignBundleList from '../../components/CampaignBundleList/CampaignBundleList';


const CampaignsListView = () => {

    const dispatch = useDispatch();
    const campaignList = useCampaignList(true);

    const { campaignBundleList } = useSelector((state: ApplicationState) => state.campaign);
    const [removingModalCampaign, setRemovingModalCampaign] = useState<CampaignBundle | undefined>();

    useEffect(() => {
        dispatch(listCampaignBundles())
    }, [dispatch]);

    const menuActions = (campaignBundle: CampaignBundle) => [
        { title: 'Supprimer la campagne', onClick: () => setRemovingModalCampaign(campaignBundle)}
    ] as MenuAction[]

    return (
        <>
            <Container>
                <AppBreadcrumb />
                <Title as="h1" className="fr-mb-4w">Logements suivis</Title>
                <Tabs>
                    <Tab label="En cours">
                        <CampaignBundleList campaignBundleList={campaignBundleList ?? []} menuActions={menuActions} />
                    </Tab>
                    <Tab label="Passé">
                        <>
                             <Text>Il n&acute;y a pas de campagne passée.</Text>
                        </>
                    </Tab>
                </Tabs>
            </Container>
            {removingModalCampaign &&
                <ConfirmationModal
                    onSubmit={() => {
                        dispatch(deleteCampaignBundle(removingModalCampaign.campaignNumber))
                        setRemovingModalCampaign(undefined);
                    }}
                    onClose={() => setRemovingModalCampaign(undefined)}>
                    <Text size="md">
                        Êtes-vous sûr de vouloir supprimer cette campagne ?
                    </Text>
                    {(removingModalCampaign.campaignNumber < (campaignList ?? []).length) &&
                        <Alert description="Les campagnes suivantes seront renumérotées"
                               type="info"/>
                    }
                </ConfirmationModal>
            }
        </>
    );
};

export default CampaignsListView;
