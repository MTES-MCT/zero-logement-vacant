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
import { useAppDispatch, useAppSelector } from './hooks/useStore';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import HousingListView from './views/HousingList/HousingListView';
import CampaignView from './views/Campaign/CampaignView';
import GroupView from './views/Group/GroupView';
import CampaignsListView from './views/Campaign/CampaignListView';
import HousingView from './views/Housing/HousingView';
import OwnerView from './views/Owner/OwnerView';
import StatusView from './views/Resources/StatusView';
import ResourcesView from './views/Resources/ResourcesView';
import AccountView from './views/Account/AccountView';
import AccountPasswordView from './views/Account/AccountPasswordView';
import UsersView from './views/Users/UsersView';
import TerritoryEstablishmentsView from './views/TerritoryEstablishments/TerritoryEstablishmentsView';
import GuestLayout from './layouts/GuestLayout';
import AccountCreationView from './views/Account/AccountCreationView';
import LoginView from './views/Login/LoginView';
import ForgottenPasswordView from './views/Account/ForgottenPasswordView';
import ResetPasswordView from './views/Account/ResetPasswordView';
import NotFoundView from './views/NotFoundView';
import AnalysisView from './views/Analysis/AnalysisView';

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
        <Route path="/analyses" element={<AnalysisView />} />
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
        <Route path="/compte/mot-de-passe" element={<AccountPasswordView />} />

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

function App() {
  const dispatch = useAppDispatch();
  const isSomeQueryPending = useAppSelector((state) =>
    Object.values(state.api.queries).some(
      (query) => query?.status === 'pending'
    )
  );

  useEffect(() => {
    if (isSomeQueryPending) {
      dispatch(showLoading());
    } else {
      dispatch(hideLoading());
    }
  }, [dispatch, isSomeQueryPending]);

  return <RouterProvider router={router} />;
}

export default App;
