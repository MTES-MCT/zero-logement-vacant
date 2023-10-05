import React, { useEffect } from 'react';
import { Col, Row } from '../../components/dsfr/index';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import CampaignBundleList from '../../components/CampaignBundleList/CampaignBundleList';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import AppLink from '../../components/AppLink/AppLink';
import MainContainer from '../../components/MainContainer/MainContainer';
import Button from '@codegouvfr/react-dsfr/Button';
import { Callout, CalloutText, CalloutTitle } from '../../components/dsfr';

const CampaignsListView = () => {
  useDocumentTitle('Campagnes');
  const dispatch = useAppDispatch();
  const { campaignBundle: inProgressCampaignBundle } = useAppSelector(
    (state) => state.campaign
  );

  useEffect(() => {
    dispatch(getCampaignBundle({}));
  }, [dispatch]);

  return (
    <MainContainer
      title={
        <>
          Vos logements suivis ({inProgressCampaignBundle?.housingCount})
          <AppLink
            className="fr-ml-2w fr-link"
            iconId="fr-icon-arrow-right-line"
            iconPosition="right"
            isSimple
            to="/campagnes/C"
          >
            Voir tout
          </AppLink>
          <Button
            onClick={() =>
              window.open(inProgressCampaignBundle?.exportURL, '_self')
            }
            className="float-right"
            iconId="fr-icon-download-line"
          >
            Exporter les données
          </Button>
        </>
      }
    >
      <CampaignBundleList withDeletion={true} />

      <Row spacing="py-5w">
        <Col>
          <Callout hasInfoIcon={false} className="fr-mr-4w">
            <CalloutTitle as="h3">
              Vous souhaitez créer une nouvelle campagne ?
            </CalloutTitle>
            <CalloutText as="p">
              Vous pouvez également en créer une nouvelle directement dans une
              campagne existante (pour une relance par exemple)
            </CalloutText>
            <Button
              linkProps={{ to: '/parc-de-logements' }}
              priority="secondary"
            >
              Créer votre nouvelle campagne
            </Button>
          </Callout>
        </Col>
        <Col>
          <Callout hasInfoIcon={false} className="fr-ml-4w">
            <CalloutTitle as="h3">
              Vous souhaitez concevoir des courriers plus percutants ?
            </CalloutTitle>
            <CalloutText as="p">
              Accédez à nos modèles de courriers et ceux envoyés par les autres
              collectivités
            </CalloutText>
            <Button
              linkProps={{
                to: 'https://airtable.com/shrs2VFNm19BDMiVO/tblxKoKN1XGk0tM3R',
                target: '_blank',
              }}
              priority="secondary"
            >
              Voir la bibliothèque des courriers
            </Button>
          </Callout>
        </Col>
      </Row>
    </MainContainer>
  );
};

export default CampaignsListView;
