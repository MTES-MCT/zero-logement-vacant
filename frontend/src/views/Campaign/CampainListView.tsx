import React, { useEffect } from 'react';
import {
  Callout,
  CalloutText,
  CalloutTitle,
  Col,
  Container,
  Link,
  Link as DSFRLink,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import CampaignBundleList from '../../components/CampaignBundleList/CampaignBundleList';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';

const CampaignsListView = () => {
  useDocumentTitle('Logements suivis');
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
          <AppBreadcrumb />
          <Row>
            <Title as="h1" className="fr-mb-4w">
              Logements suivis
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
          <DSFRLink
            title="Voir tout"
            isSimple
            icon="ri-arrow-right-line"
            iconPosition="right"
            href="/campagnes/C"
            className="fr-ml-2w fr-link"
          >
            Voir tout
          </DSFRLink>
        </Title>

        <CampaignBundleList withDeletion={true} />

        <Row spacing="py-5w">
          <Col>
            <Callout hasInfoIcon={false} className="fr-mr-4w">
              <CalloutTitle as="h3">
                Vous souhaitez créer une nouvelle campagne ?
              </CalloutTitle>
              <CalloutText as="p">
                Vous pouvez également en créer une nouvelle directement dans une
                campagne existante (pour une relance par exemple)
              </CalloutText>
              <Link
                title="Créer votre nouvelle campagne"
                href="/base-de-donnees?campagne=true"
                className="fr-btn--md fr-btn fr-btn--secondary"
              >
                Créer votre nouvelle campagne
              </Link>
            </Callout>
          </Col>
          <Col>
            <Callout hasInfoIcon={false} className="fr-ml-4w">
              <CalloutTitle as="h3">
                Vous souhaitez concevoir des courriers plus percutants ?
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
