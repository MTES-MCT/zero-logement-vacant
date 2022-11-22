import React, { useState } from 'react';
import { Col, Container, Link as DSFRLink, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch } from 'react-redux';
import { updateCampaignBundleTitle } from '../../store/actions/campaignAction';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { CampaignBundle, getCampaignBundleId } from '../../models/Campaign';
import CampaignBundleList from '../../components/CampaignBundleList/CampaignBundleList';
import CampaignBundleTitleModal from '../../components/modals/CampaignTitleModal/CampaignBundleTitleModal';
import { TrackEventActions, TrackEventCategories } from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';


const CampaignsListView = () => {

    const dispatch = useDispatch();
    const { trackEvent } = useMatomo();

    const [titleModalCampaignBundle, setTitleModalCampaignBundle] = useState<CampaignBundle | undefined>();

    const onSubmitCampaignTitle = (title: string) => {
        const campaignBundleId = getCampaignBundleId(titleModalCampaignBundle)
        if (campaignBundleId) {
            trackEvent({
                category: TrackEventCategories.Campaigns,
                action: TrackEventActions.Campaigns.Rename
            })
            dispatch(updateCampaignBundleTitle(campaignBundleId, title))
            setTitleModalCampaignBundle(undefined);
        }
    }

    return (
        <>
            <div className="bg-100">
                <Container spacing="py-4w">
                    <AppBreadcrumb />
                    <Row>
                        <Title as="h1" className="fr-mb-4w">Logements suivis</Title>
                    </Row>
                    <Row>
                        <Col>
                            <Text size="lead" className="subtitle">
                                Retrouvez l'ensemble des logements contactés et suivez les avancées de votre mobilisation.
                            </Text>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="py-4w">
                <Title as="h2" look="h5">
                    Vos logements suivis
                    <DSFRLink
                        title="Voir tout"
                        isSimple
                        icon="ri-arrow-right-line"
                        iconPosition="right"
                        href="/campagnes/C"
                        className="fr-ml-2w fr-link">
                        Voir tout
                    </DSFRLink>
                </Title>
                <CampaignBundleList withDeletion={true}/>
            </Container>
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
