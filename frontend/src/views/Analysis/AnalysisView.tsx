import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import { useFindOneDashboardQuery } from '../../services/dashboard.service';

function AnalysisView(props: { id: string }) {
  useDocumentTitle('Analyse');

  const { data: dashboard } = useFindOneDashboardQuery({
    id: props.id as "6-utilisateurs-de-zlv-sur-votre-structure" | "7-autres-structures-de-votre-territoires-inscrites-sur-zlv" | "13-analyses" | "15-analyses-activites"
  });

  return (
    <MainContainer>
      <iframe src={dashboard?.url} width="100%" height="850" title="Analyses" />
    </MainContainer>
  );
}

export default AnalysisView;
