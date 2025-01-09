import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import { useFindOneDashboardQuery } from '../../services/dashboard.service';

function AnalysisView() {
  useDocumentTitle('Analyse');

  const { data: dashboard } = useFindOneDashboardQuery({
    id: '13-analyses'
  });

  return (
    <MainContainer>
      <iframe src={dashboard?.url} width="100%" height="850" title="Analyses" />
    </MainContainer>
  );
}

export default AnalysisView;
