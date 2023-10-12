import React, { useEffect } from 'react';
import { Col, Row, Text } from '../../components/_dsfr';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import CampaignBundleList from '../../components/CampaignBundleList/CampaignBundleList';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import AppLink from '../../components/_app/AppLink/AppLink';
import MainContainer from '../../components/MainContainer/MainContainer';
import Button from '@codegouvfr/react-dsfr/Button';
import CallOut from '@codegouvfr/react-dsfr/CallOut';

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
          <CallOut
            title={
              <Text size="lg">
                Vous souhaitez créer une nouvelle campagne ?
              </Text>
            }
            className="fr-mr-4w"
            children="Vous pouvez également en créer une nouvelle directement dans une
                campagne existante (pour une relance par exemple)"
            buttonProps={{
              priority: 'secondary',
              linkProps: { to: '/parc-de-logements' },
              children: 'Créer votre nouvelle campagne',
            }}
          />
        </Col>
        <Col>
          <CallOut
            title={
              <Text size="lg">
                Vous souhaitez concevoir des courriers plus percutants ?
              </Text>
            }
            className="fr-mr-4w"
            children="Accédez à nos modèles de courriers et ceux envoyés par les autres collectivités"
            buttonProps={{
              priority: 'secondary',
              linkProps: {
                to: 'https://airtable.com/shrs2VFNm19BDMiVO/tblxKoKN1XGk0tM3R',
                target: '_blank',
              },
              children: 'Voir la bibliothèque des courriers',
            }}
          />
        </Col>
      </Row>
    </MainContainer>
  );
};

export default CampaignsListView;
