import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row, Tab, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { deleteCampaignBundle, listCampaignBundles } from '../../store/actions/campaignAction';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { CampaignBundleId } from '../../models/Campaign';
import { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import { useCampaignList } from '../../hooks/useCampaignList';
import CampaignBundleList from '../../components/CampaignBundleList/CampaignBundleList';
import { useHistory } from 'react-router-dom';


const CampaignsListView = () => {

    const dispatch = useDispatch();
    const history = useHistory();
    const campaignList = useCampaignList(true);

    const { campaignBundleList } = useSelector((state: ApplicationState) => state.campaign);
    const [removingModalCampaignBundleId, setRemovingModalCampaignBundleId] = useState<CampaignBundleId | undefined>();

    useEffect(() => {
        dispatch(listCampaignBundles())
    }, [dispatch]);

    const menuActions = (CampaignBundleId: CampaignBundleId) => [
        { title: `Supprimer la ${CampaignBundleId.reminderNumber ? 'relance' : 'campagne'}`, onClick: () => setRemovingModalCampaignBundleId(CampaignBundleId)}
    ] as MenuAction[]

    return (
        <>
            <Container>
                <AppBreadcrumb />
                <Title as="h1" className="fr-mb-4w">Logements suivis</Title>
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
                    onSubmit={() => {
                        if (removingModalCampaignBundleId.campaignNumber) {
                            dispatch(deleteCampaignBundle(removingModalCampaignBundleId))
                        }
                        setRemovingModalCampaignBundleId(undefined);
                    }}
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
        </>
    );
};

export default CampaignsListView;
