import { useEffect } from 'react';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import {
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider
} from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '~/hooks/useStore';
import AuthenticatedLayout from '~/layouts/AuthenticatedLayout';
import FeatureFlagLayout from '~/layouts/FeatureFlagLayout';
import GuestLayout from '~/layouts/GuestLayout';
import sentry from '~/utils/sentry';
import AccountCreationView from '~/views/Account/AccountCreationView';
import AccountView from '~/views/Account/AccountView';
import ForgottenPasswordView from '~/views/Account/ForgottenPasswordView';
import ProfileLayout from '~/views/Account/Profile/ProfileLayout';
import TerritoryEstablishmentsView from '~/views/Account/Profile/TerritoryEstablishmentsView';
import UsersView from '~/views/Account/Profile/UsersView';
import ResetPasswordView from '~/views/Account/ResetPasswordView';
import AnalysisView from '~/views/Analysis/AnalysisView';
import CampaignListView from '~/views/Campaign/CampaignListView';
import CampaignListViewNext from '~/views/Campaign/CampaignListViewNext';
import CampaignView from '~/views/Campaign/CampaignView';
import CampaignViewNext from '~/views/Campaign/CampaignViewNext';
import GroupView from '~/views/Group/GroupView';
import GroupViewNext from '~/views/Group/GroupViewNext';
import HousingOwnersView from '~/views/Housing/HousingOwnersView';
import HousingView from '~/views/Housing/HousingView';
import HousingListTabsProvider from '~/views/HousingList/HousingListTabsProvider';
import HousingListView from '~/views/HousingList/HousingListView';
import HousingListViewNext from '~/views/HousingList/HousingListViewNext';
import LoginView from '~/views/Login/LoginView';
import TwoFactorView from '~/views/Login/TwoFactorView';
import NotFoundView from '~/views/NotFoundView';
import OwnerView from '~/views/Owner/OwnerView';
import ResourcesView from '~/views/Resources/ResourcesView';
import StatusView from '~/views/Resources/StatusView';
import SiteMapView from '~/views/SiteMapView';
import './App.scss';

const router = sentry.createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={<Navigate to="/parc-de-logements" />} />
        <Route path="/plan-du-site" element={<SiteMapView />} />
        <Route
          path="/parc-de-logements"
          element={
            <HousingListTabsProvider>
              <FeatureFlagLayout
                flag="new-campaigns"
                then={<HousingListViewNext />}
                else={<HousingListView />}
              />
            </HousingListTabsProvider>
          }
        />
        <Route
          path="/parc-de-logements/campagnes/:id"
          element={<CampaignView />}
        />
        <Route
          path="/analyses/parc-vacant"
          element={<AnalysisView id="13-analyses" />}
        />
        <Route
          path="/analyses/lutte"
          element={<AnalysisView id="15-analyses-activites" />}
        />
        <Route
          path="/groupes/:id"
          element={
            <FeatureFlagLayout
              flag="new-campaigns"
              then={<GroupViewNext />}
              else={<GroupView />}
            />
          }
        />
        <Route
          path="/campagnes"
          element={
            <FeatureFlagLayout
              flag="new-campaigns"
              then={<CampaignListViewNext />}
              else={<CampaignListView />}
            />
          }
        />
        <Route
          path="/campagnes/:id"
          element={
            <FeatureFlagLayout
              flag="new-campaigns"
              then={<CampaignViewNext />}
              else={<CampaignView />}
            />
          }
        />
        <Route path="/proprietaires/:id" element={<OwnerView />} />
        <Route path="/logements/:housingId" element={<HousingView />} />
        <Route
          path="/logements/:id/proprietaires"
          element={<HousingOwnersView />}
        />

        <Route path="/ressources/statuts" element={<StatusView />} />
        <Route path="/ressources" element={<ResourcesView />} />

        {/* Profile views */}
        <Route element={<ProfileLayout />}>
          <Route path="/compte" element={<AccountView />} />
          <Route path="/utilisateurs" element={<UsersView />} />
          <Route
            path="/autres-structures"
            element={<TerritoryEstablishmentsView />}
          />
        </Route>
      </Route>

      <Route element={<GuestLayout />}>
        <Route path="/inscription/*" element={<AccountCreationView />} />
        <Route path="/connexion" element={<LoginView />} />
        <Route path="/verification-2fa" element={<TwoFactorView />} />
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

  return (
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  );
}

export default App;
