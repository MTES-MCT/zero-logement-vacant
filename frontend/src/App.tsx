import { useEffect } from 'react';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider
} from 'react-router-dom';

import './App.scss';
import LoginView from './views/Login/LoginView';
import HousingListView from './views/HousingList/HousingListView';
import FetchInterceptor from './components/FetchInterceptor/FetchInterceptor';
import OwnerView from './views/Owner/OwnerView';
import CampaignsListView from './views/Campaign/CampaignListView';
import CampaignView from './views/Campaign/CampaignView';
import AccountPasswordView from './views/Account/AccountPasswordView';
import HousingView from './views/Housing/HousingView';
import ResourcesView from './views/Resources/ResourcesView';
import AccountCreationView from './views/Account/AccountCreationView';
import ForgottenPasswordView from './views/Account/ForgottenPasswordView';
import ResetPasswordView from './views/Account/ResetPasswordView';
import { useAppDispatch, useAppSelector } from './hooks/useStore';
import StatusView from './views/Resources/StatusView';
import AccountView from './views/Account/AccountView';
import GroupView from './views/Group/GroupView';
import UsersView from './views/Users/UsersView';
import TerritoryEstablishmentsView from './views/TerritoryEstablishments/TerritoryEstablishmentsView';
import NotFoundView from './views/NotFoundView';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import GuestLayout from './layouts/GuestLayout';

function App() {
  const dispatch = useAppDispatch();
  const isSomeQueryPending = useAppSelector((state) =>
    Object.values(state.api.queries).some(
      (query) => query?.status === 'pending'
    )
  );

  FetchInterceptor();

  useEffect(() => {
    if (isSomeQueryPending) {
      dispatch(showLoading());
    } else {
      dispatch(hideLoading());
    }
  }, [dispatch, isSomeQueryPending]);

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/" element={<Navigate to="/parc-de-logements" />} />
          <Route path="/parc-de-logements" element={<HousingListView />} />
          <Route
            path="/parc-de-logements/campagnes/:id"
            element={<CampaignView />}
          />
          <Route path="/groupes/:id" element={<GroupView />} />
          <Route path="/campagnes" element={<CampaignsListView />} />
          <Route path="/campagnes/:id" element={<CampaignView />} />
          <Route
            path="/proprietaires/:ownerId/logements/:housingId"
            element={<HousingView />}
          />
          <Route path="/proprietaires/:ownerId" element={<OwnerView />} />
          <Route
            path="/logements/:housingId/proprietaires/:ownerId"
            element={<OwnerView />}
          />
          <Route path="/logements/:housingId" element={<HousingView />} />
          <Route path="/ressources/statuts" element={<StatusView />} />
          <Route path="/ressources" element={<ResourcesView />} />

          <Route path="/compte" element={<AccountView />} />
          <Route
            path="/compte/mot-de-passe"
            element={<AccountPasswordView />}
          />

          <Route path="/utilisateurs" element={<UsersView />} />
          <Route
            path="/autres-etablissements"
            element={<TerritoryEstablishmentsView />}
          />
        </Route>

        <Route element={<GuestLayout />}>
          <Route path="/inscription/*" element={<AccountCreationView />} />
          <Route path="/connexion" element={<LoginView />} />
          <Route
            path="/mot-de-passe/oublie"
            element={<ForgottenPasswordView />}
          />
          <Route path="/mot-de-passe/nouveau" element={<ResetPasswordView />} />
          <Route path="/admin" element={<LoginView />} />
        </Route>

        <Route path="*" element={<NotFoundView />} />
      </Route>
    )
  );

  return <RouterProvider router={router} />;
}

export default App;
