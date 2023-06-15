import React, { useEffect } from 'react';
import {
  Button,
  Callout,
  CalloutText,
  CalloutTitle,
  Col,
  Container,
  Link,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import CampaignBundleList from '../../components/CampaignBundleList/CampaignBundleList';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import InternalLink from '../../components/InternalLink/InternalLink';

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
    <>
      <div className="bg-100">
        <Container as="section" spacing="py-4w">
          <Row>
            <Title as="h1" className="fr-mb-4w">
              Campagnes
            </Title>
          </Row>
          <Row>
            <Col>
              <Text size="lead" className="subtitle">
                Retrouvez l'ensemble des logements contactés et suivez les
                avancées de votre mobilisation.
              </Text>
            </Col>
          </Row>
        </Container>
      </div>
      <Container as="section" spacing="py-4w">
        <Title as="h2" look="h5">
          Vos logements suivis ({inProgressCampaignBundle?.housingCount})
          <InternalLink
            className="fr-ml-2w fr-link"
            icon="ri-arrow-right-line"
            iconPosition="right"
            isSimple
            to="/campagnes/C"
          >
            Voir tout
          </InternalLink>
          <Button
            onClick={() =>
              window.open(inProgressCampaignBundle?.exportURL, '_self')
            }
            className="float-right"
            icon="ri-download-line"
          >
            Exporter les données
          </Button>
        </Title>

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
              <InternalLink
                to="/parc-de-logements"
                className="fr-btn--md fr-btn fr-btn--secondary"
              >
                Créer votre nouvelle campagne
              </InternalLink>
            </Callout>
          </Col>
          <Col>
            <Callout hasInfoIcon={false} className="fr-ml-4w">
              <CalloutTitle as="h3">
                Vous souhaitez concevoir des courriers plus percutants ?
              </CalloutTitle>
              <CalloutText as="p">
                Accédez à nos modèles de courriers et ceux envoyés par les
                autres collectivités
              </CalloutText>
              <Link
                title="Voir la bibliothèque des courriers"
                href="https://airtable.com/shrs2VFNm19BDMiVO/tblxKoKN1XGk0tM3R"
                target="_blank"
                className="fr-btn--md fr-btn fr-btn--secondary"
              >
                Voir la bibliothèque des courriers
              </Link>
            </Callout>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default CampaignsListView;
