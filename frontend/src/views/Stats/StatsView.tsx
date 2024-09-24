import config from '../../utils/config';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';

const StatsView = () => {
  useDocumentTitle('Statistiques');
  return (
    <MainContainer title="Statistiques">
      {config.metabase.siteUrl && config.metabase.public.statsDashboard ? (
        <iframe
          src={`https://zerologementvacant-metabase-prod.osc-secnum-fr1.scalingo.io/public/dashboard/${config.metabase.public.statsDashboard}`}
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
