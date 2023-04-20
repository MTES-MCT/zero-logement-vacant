import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem } from '@dataesr/react-dsfr';
import { useLocation, useParams } from 'react-router-dom';
import {
  getUserNavItem,
  UserNavItem,
  UserNavItems,
} from '../../models/UserNavItem';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import {
  campaignBundleIdUrlFragment,
  campaignFullName,
  getCampaignBundleId,
} from '../../models/Campaign';
import { getOwner } from '../../store/actions/ownerAction';
import { getHousing } from '../../store/actions/housingAction';
import { UserRoles } from '../../models/User';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import InternalLink from '../InternalLink/InternalLink';

interface BreadcrumbParams {
  campaignNumber: string;
  reminderNumber: string;
  ownerId: string;
  housingId: string;
  establishmentId: string;
}

const AppBreadcrumb = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const {
    campaignNumber,
    reminderNumber,
    ownerId,
    housingId,
    establishmentId,
  } = useParams<BreadcrumbParams>();

  const [items, setItems] = useState<UserNavItem[]>([
    getUserNavItem(UserNavItems.Dashboard),
  ]);

  const { campaignBundle } = useAppSelector((state) => state.campaign);
  const { owner } = useAppSelector((state) => state.owner);
  const { housing } = useAppSelector((state) => state.housing);
  const { availableEstablishments, authUser } = useAppSelector(
    (state) => state.authentication
  );

  useEffect(() => {
    if (
      location.pathname.includes('campagnes/C') &&
      !campaignBundle &&
      campaignNumber
    ) {
      dispatch(
        getCampaignBundle({
          campaignNumber: campaignNumber ? Number(campaignNumber) : undefined,
          reminderNumber: reminderNumber ? Number(reminderNumber) : undefined,
        })
      );
    }
    if (location.pathname.includes('proprietaires/') && !owner && ownerId) {
      dispatch(getOwner(ownerId));
    }
    if (location.pathname.includes('logements/') && !housing && housingId) {
      dispatch(getHousing(housingId));
    }

    if (authUser) {
      setItems(
        location.pathname
          .split('/')
          .map((value) => {
            if (['/', ''].includes(value)) {
              return getUserNavItem(UserNavItems.Dashboard);
            }

            const navItem = [
              UserNavItems.Dashboard,
              UserNavItems.HousingList,
              UserNavItems.Establishment,
              UserNavItems.Campaign,
              UserNavItems.User,
              UserNavItems.Resources,
              UserNavItems.Inbox,
            ]
              .map((path) => getUserNavItem(path))
              .find((item) => item.url.substring(1) === value);

            if (navItem) {
              return navItem;
            }

            if (
              value === getUserNavItem(UserNavItems.Monitoring).url.substring(1)
            ) {
              return authUser.user.role === UserRoles.Admin
                ? getUserNavItem(UserNavItems.Monitoring)
                : getUserNavItem(
                    UserNavItems.EstablishmentMonitoring,
                    authUser.establishment.id
                  );
            }

            if (value.indexOf('C') === 0 && campaignBundle) {
              return {
                url:
                  '/campagnes/' +
                  campaignBundleIdUrlFragment(
                    getCampaignBundleId(campaignBundle)
                  ),
                label: campaignFullName(campaignBundle),
              };
            }

            if (value.includes('proprietaires') && owner) {
              return {
                url: location.pathname.substring(
                  0,
                  location.pathname.indexOf(ownerId) + ownerId.length
                ),
                label: owner.fullName,
              };
            }

            if (value.includes('logements') && housing) {
              return {
                url: location.pathname.substring(
                  0,
                  location.pathname.indexOf(housingId) + housingId.length
                ),
                label: housing.rawAddress.join(' - '),
              };
            }

            if (
              value.includes('etablissement') &&
              establishmentId &&
              availableEstablishments
            ) {
              return {
                url: location.pathname,
                label:
                  availableEstablishments.find((_) => _.id === establishmentId)
                    ?.name ?? '',
              };
            }

            if (value === 'statuts') {
              return { url: '', label: 'Arborescence des status' };
            }

            return null;
          })
          .filter((_): _ is UserNavItem => _ !== null)
      );
    }
  }, [
    dispatch,
    location,
    campaignBundle,
    owner,
    housing,
    campaignNumber,
    housingId,
    ownerId,
    reminderNumber,
    availableEstablishments,
    establishmentId,
    authUser,
  ]);

  return (
    <Breadcrumb className="fr-mt-0 fr-pt-3w fr-mb-2w">
      {items.map((item, index) =>
        index < items.length - 1 ? (
          <BreadcrumbItem
            href={item.url}
            key={item.label}
            data-testid="nav-item"
            asLink={<InternalLink to={item.url} />}
          >
            {item.label}
          </BreadcrumbItem>
        ) : (
          <BreadcrumbItem key={item.label}>{item.label}</BreadcrumbItem>
        )
      )}
    </Breadcrumb>
  );
};

export default AppBreadcrumb;
