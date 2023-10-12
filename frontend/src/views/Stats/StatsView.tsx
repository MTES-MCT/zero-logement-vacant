import React from 'react';
import config from '../../utils/config';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';

const StatsView = () => {
  useDocumentTitle('Statistiques');
  return (
    <MainContainer title="Statistiques">
      {config.publicStatsUrl ? (
        <iframe
          src={config.publicStatsUrl}
          width="100%"
          height="900"
          title="Statistiques"
        ></iframe>
      ) : (
        <>Statistiques indisponibles</>
      )}
    </MainContainer>
  );
};

export default StatsView;
