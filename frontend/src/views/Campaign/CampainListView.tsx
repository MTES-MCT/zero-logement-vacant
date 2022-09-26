import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row, Tab, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
    deleteCampaignBundle,
    listCampaignBundles,
    updateCampaignBundleTitle,
} from '../../store/actions/campaignAction';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { CampaignBundle, CampaignBundleId, getCampaignBundleId } from '../../models/Campaign';
import { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import { useCampaignList } from '../../hooks/useCampaignList';
import CampaignBundleList from '../../components/CampaignBundleList/CampaignBundleList';
import { useHistory } from 'react-router-dom';
import CampaignBundleTitleModal from '../../components/modals/CampaignTitleModal/CampaignBundleTitleModal';


const CampaignsListView = () => {

    const dispatch = useDispatch();
    const history = useHistory();
    const campaignList = useCampaignList(true);

    const { campaignBundleList } = useSelector((state: ApplicationState) => state.campaign);
    const [titleModalCampaignBundle, setTitleModalCampaignBundle] = useState<CampaignBundle | undefined>();
    const [removingModalCampaignBundleId, setRemovingModalCampaignBundleId] = useState<CampaignBundleId | undefined>();

    useEffect(() => {
        dispatch(listCampaignBundles())
    }, [dispatch]);

    const menuActions = (campaignBundleId: CampaignBundleId) => campaignBundleId.reminderNumber ?
        [
            { title: 'Supprimer la relance', onClick: () => setRemovingModalCampaignBundleId(campaignBundleId)}
        ] : [
            { title: 'Modifier le titre', onClick: () => setTitleModalCampaignBundle(campaignBundleList?.find(_ => _.campaignNumber === campaignBundleId.campaignNumber))},
            { title: 'Supprimer la campagne', onClick: () => setRemovingModalCampaignBundleId(campaignBundleId)}
        ] as MenuAction[]

    const onSubmitRemovingCampaign = () => {
        if (removingModalCampaignBundleId?.campaignNumber) {
            dispatch(deleteCampaignBundle(removingModalCampaignBundleId))
        }
        setRemovingModalCampaignBundleId(undefined);
    }

    const onSubmitCampaignTitle = (title: string) => {
        const campaignBundleId = getCampaignBundleId(titleModalCampaignBundle)
        if (campaignBundleId) {
            dispatch(updateCampaignBundleTitle(campaignBundleId, title))
            setTitleModalCampaignBundle(undefined);
        }
    }

    return (
        <>
            <div className="bg-100">
                <Container className="bg-100">
                    <AppBreadcrumb />
                    <Row>
                        <Title as="h1" className="fr-mb-4w">Logements suivis</Title>
                    </Row>
                </Container>
            </div>
            <Container spacing="py-4w">
                <Tabs>
                    <Tab label="En cours">
                        <Row>
                            <Col>
                                <Button
                                    size="sm"
                                    secondary
                                    title="Voir tous les logements suivis"
                                    className="float-right fr-mb-2w"
                                    onClick={() => history.push('/campagnes/C')}>
                                    <span className="ri-1x icon-left ri-eye-line ds-fr--v-middle" />
                                    Voir tous les logements
                                </Button>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <CampaignBundleList campaignBundleList={campaignBundleList ?? []} menuActions={menuActions} />
                            </Col>
                        </Row>
                    </Tab>
                    <Tab label="Passé">
                        <>
                             <Text>Il n&acute;y a pas de campagne passée.</Text>
                        </>
                    </Tab>
                </Tabs>
            </Container>
            {removingModalCampaignBundleId && removingModalCampaignBundleId.campaignNumber &&
                <ConfirmationModal
                    onSubmit={onSubmitRemovingCampaign}
                    onClose={() => setRemovingModalCampaignBundleId(undefined)}>
                    <Text size="md">
                        Êtes-vous sûr de vouloir supprimer cette {removingModalCampaignBundleId.reminderNumber ? 'relance' : 'campagne'} ?
                    </Text>
                    {(!removingModalCampaignBundleId.reminderNumber && removingModalCampaignBundleId.campaignNumber < (campaignList ?? []).length) &&
                        <Alert description="Les campagnes suivantes seront renumérotées"
                               type="info"/>
                    }
                </ConfirmationModal>
            }
            {titleModalCampaignBundle &&
                <CampaignBundleTitleModal
                    campaignBundle={titleModalCampaignBundle}
                    onSubmit={onSubmitCampaignTitle}
                    onClose={() => setTitleModalCampaignBundle(undefined)} />
            }
        </>
    );
};

export default CampaignsListView;
