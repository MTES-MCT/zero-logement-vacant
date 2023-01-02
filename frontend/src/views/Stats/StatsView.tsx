import React from 'react';
import { Container, Row, Title } from '@dataesr/react-dsfr';
import config from '../../utils/config';

const StatsView = () => {
  return (
    <>
      <div className="bg-100">
        <Container as="section" spacing="py-4w">
          <Row>
            <Title as="h1" className="fr-mb-4w">
              Statistiques
            </Title>
          </Row>
        </Container>
      </div>
      <Container as="section" spacing="py-4w">
        {config.publicStatsUrl ? (
          <iframe
            src={config.publicStatsUrl}
            width="100%"
            height="900"
            allowTransparency
            title="Statistiques"
          ></iframe>
        ) : (
          <>Statistiques indisponibles</>
        )}
      </Container>
    </>
  );
};

export default StatsView;
