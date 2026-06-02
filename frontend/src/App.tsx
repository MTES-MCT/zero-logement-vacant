import { lazy, useEffect } from 'react';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import {
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider
} from 'react-router';

import { useAppDispatch, useAppSelector } from '~/hooks/useStore';
import AuthenticatedLayout from '~/layouts/AuthenticatedLayout';
import GuestLayout from '~/layouts/GuestLayout';
import sentry from '~/utils/sentry';
import NotFoundView from '~/views/NotFoundView';

const AccountCreationView = lazy(() => import('~/views/Account/AccountCreationView'));
const AccountView = lazy(() => import('~/views/Account/AccountView'));
const ForgottenPasswordView = lazy(() => import('~/views/Account/ForgottenPasswordView'));
const ProfileLayout = lazy(() => import('~/views/Account/Profile/ProfileLayout'));
const TerritoryEstablishmentsView = lazy(() => import('~/views/Account/Profile/TerritoryEstablishmentsView'));
const UsersView = lazy(() => import('~/views/Account/Profile/UsersView'));
const ResetPasswordView = lazy(() => import('~/views/Account/ResetPasswordView'));
const AnalysisView = lazy(() => import('~/views/Analysis/AnalysisView'));
const CampaignListView = lazy(() => import('~/views/Campaign/CampaignListView'));
const CampaignView = lazy(() => import('~/views/Campaign/CampaignView'));
const GroupView = lazy(() => import('~/views/Group/GroupView'));
const HousingOwnersView = lazy(() => import('~/views/Housing/HousingOwnersView'));
const HousingView = lazy(() => import('~/views/Housing/HousingView'));
const HousingListTabsProvider = lazy(() => import('~/views/HousingList/HousingListTabsProvider'));
const HousingListView = lazy(() => import('~/views/HousingList/HousingListView'));
const LoginView = lazy(() => import('~/views/Login/LoginView'));
const TwoFactorView = lazy(() => import('~/views/Login/TwoFactorView'));
const OwnerView = lazy(() => import('~/views/Owner/OwnerView'));
const ResourcesView = lazy(() => import('~/views/Resources/ResourcesView'));
const StatusView = lazy(() => import('~/views/Resources/StatusView'));
const SiteMapView = lazy(() => import('~/views/SiteMapView'));
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
              <HousingListView />
            </HousingListTabsProvider>
          }
        />
        <Route
          path="/analyses/parc-vacant"
          element={<AnalysisView id="13-analyses" />}
        />
        <Route
          path="/analyses/lutte"
          element={<AnalysisView id="15-analyses-activites" />}
        />
        <Route path="/groupes/:id" element={<GroupView />} />
        <Route path="/campagnes" element={<CampaignListView />} />
        <Route path="/campagnes/:id" element={<CampaignView />} />
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

  return <RouterProvider router={router} />;
}

export default App;
