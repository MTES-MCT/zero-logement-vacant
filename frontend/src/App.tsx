import { useEffect } from 'react';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import {
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider
} from 'react-router-dom';

import './App.scss';
import { useIsDsfrReady } from './hooks/useIsDsfrReady';
import { useAppDispatch, useAppSelector } from './hooks/useStore';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import GuestLayout from './layouts/GuestLayout';
import sentry from './utils/sentry';
import AccountCreationView from './views/Account/AccountCreationView';
import AccountPasswordView from './views/Account/AccountPasswordView';
import AccountView from './views/Account/AccountView';
import ForgottenPasswordView from './views/Account/ForgottenPasswordView';
import ResetPasswordView from './views/Account/ResetPasswordView';
import AnalysisView from './views/Analysis/AnalysisView';
import CampaignsListView from './views/Campaign/CampaignListView';
import CampaignView from './views/Campaign/CampaignView';
import GroupView from './views/Group/GroupView';
import HousingView from './views/Housing/HousingView';
import HousingListTabsProvider from './views/HousingList/HousingListTabsProvider';
import HousingListView from './views/HousingList/HousingListView';
import LoginView from './views/Login/LoginView';
import NotFoundView from './views/NotFoundView';
import OwnerView from './views/Owner/OwnerView';
import ResourcesView from './views/Resources/ResourcesView';
import StatusView from './views/Resources/StatusView';
import TerritoryEstablishmentsView from './views/TerritoryEstablishments/TerritoryEstablishmentsView';
import UsersView from './views/Users/UsersView';

const router = sentry.createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={<Navigate to="/parc-de-logements" />} />
        <Route
          path="/parc-de-logements"
          element={
            <HousingListTabsProvider>
              <HousingListView />
            </HousingListTabsProvider>
          }
        />
        <Route
          path="/parc-de-logements/campagnes/:id"
          element={<CampaignView />}
        />
        <Route path="/analyses/parc-vacant" element={<AnalysisView id='13-analyses' />} />
        <Route path="/analyses/lutte" element={<AnalysisView id='15-analyses-activites' />} />
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

  useIsDsfrReady();

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
