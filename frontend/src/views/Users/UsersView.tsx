import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import { useFindOneDashboardQuery } from '../../services/dashboard.service';

const UsersView = () => {
  useDocumentTitle('Utilisateurs');

  const { data: dashboard, isSuccess } = useFindOneDashboardQuery({
    id: '6-utilisateurs-de-zlv-sur-votre-structure',
  });

  return (
    <MainContainer>
      {isSuccess && (
        <iframe
          src={dashboard.url}
          width="100%"
          height="700"
          title="Utilisateurs"
        ></iframe>
      )}
    </MainContainer>
  );
};

export default UsersView;
