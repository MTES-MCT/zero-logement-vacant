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
      location.pathname.indexOf('campagnes/C') !== -1 &&
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
    if (
      location.pathname.indexOf('proprietaires/') !== -1 &&
      !owner &&
      ownerId
    ) {
      dispatch(getOwner(ownerId));
    }
    if (
      location.pathname.indexOf('logements/') !== -1 &&
      !housing &&
      housingId
    ) {
      dispatch(getHousing(housingId));
    }

    if (authUser) {
      setItems(
        location.pathname
          .split('/')
          .map((value) => {
            if (
              value ===
                getUserNavItem(UserNavItems.Dashboard).url.substring(1) ||
              value === ''
            ) {
              return getUserNavItem(UserNavItems.Dashboard);
            } else if (
              value ===
              getUserNavItem(UserNavItems.HousingList).url.substring(1)
            ) {
              return getUserNavItem(UserNavItems.HousingList);
            } else if (
              value ===
              getUserNavItem(UserNavItems.Establishment).url.substring(1)
            ) {
              return getUserNavItem(UserNavItems.Establishment);
            } else if (
              value === getUserNavItem(UserNavItems.Campaign).url.substring(1)
            ) {
              return getUserNavItem(UserNavItems.Campaign);
            } else if (
              value === getUserNavItem(UserNavItems.User).url.substring(1)
            ) {
              return getUserNavItem(UserNavItems.User);
            } else if (
              value === getUserNavItem(UserNavItems.Monitoring).url.substring(1)
            ) {
              return authUser.user.role === UserRoles.Admin
                ? getUserNavItem(UserNavItems.Monitoring)
                : getUserNavItem(
                    UserNavItems.EstablishmentMonitoring,
                    authUser.establishment.id
                  );
            } else if (value.indexOf('C') === 0 && campaignBundle) {
              return {
                url:
                  '/campagnes/' +
                  campaignBundleIdUrlFragment(
                    getCampaignBundleId(campaignBundle)
                  ),
                label: campaignFullName(campaignBundle),
              };
            } else if (value.indexOf('proprietaires') !== -1 && owner) {
              return {
                url: location.pathname.substring(
                  0,
                  location.pathname.indexOf(ownerId) + ownerId.length
                ),
                label: owner.fullName,
              };
            } else if (value.indexOf('logements') !== -1 && housing) {
              return {
                url: location.pathname.substring(
                  0,
                  location.pathname.indexOf(housingId) + housingId.length
                ),
                label: housing.rawAddress.join(' - '),
              };
            } else if (
              value.indexOf('etablissement') !== -1 &&
              establishmentId &&
              availableEstablishments
            ) {
              return {
                url: location.pathname,
                label:
                  availableEstablishments.find((_) => _.id === establishmentId)
                    ?.name ?? '',
              };
            } else if (
              value === getUserNavItem(UserNavItems.Resources).url.substring(1)
            ) {
              return getUserNavItem(UserNavItems.Resources);
            } else {
              return { url: '', label: '' };
            }
          })
          .filter((_) => _.label !== '')
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
