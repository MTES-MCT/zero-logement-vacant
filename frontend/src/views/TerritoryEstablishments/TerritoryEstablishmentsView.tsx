import React from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import { useFindOneDashboardQuery } from '../../services/dashboard.service';

const UsersView = () => {
  useDocumentTitle('Autres établissements');

  const { data: dashboard, isSuccess } = useFindOneDashboardQuery({
    id: 'etablissements',
  });

  return (
    <MainContainer>
      {isSuccess && (
        <iframe
          src={dashboard.url}
          width="100%"
          height="700"
          title="Autres établissements"
        ></iframe>
      )}
    </MainContainer>
  );
};

export default UsersView;
