import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem } from '@dataesr/react-dsfr';
import { useLocation, useParams } from 'react-router-dom';
import { getUserNavItem, UserNavItem, UserNavItems } from '../../models/UserNavItem';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import { campaignBundleIdUrlFragment, campaignName, getCampaignBundleId } from '../../models/Campaign';
import { getOwner } from '../../store/actions/ownerAction';
import { getHousing } from '../../store/actions/housingAction';


const AppBreadcrumb = () => {

    const dispatch = useDispatch();
    const location = useLocation();
    const { campaignNumber, reminderNumber, ownerId, housingId } = useParams<{campaignNumber: string, reminderNumber: string, ownerId: string, housingId: string}>();

    const [items, setItems] = useState<UserNavItem[]>([getUserNavItem(UserNavItems.Dashboard)]);

    const { campaignBundle } = useSelector((state: ApplicationState) => state.campaign);
    const { owner} = useSelector((state: ApplicationState) => state.owner);
    const { housing } = useSelector((state: ApplicationState) => state.housing);

    useEffect(() => {
        if (location.pathname.indexOf('campagnes/C') !== -1 && !campaignBundle && campaignNumber) {
            dispatch(getCampaignBundle({
                campaignNumber: campaignNumber ? Number(campaignNumber) : undefined,
                reminderNumber: reminderNumber ? Number(reminderNumber) : undefined
            }))
        }
        if (location.pathname.indexOf('proprietaires/') !== -1 && !owner && ownerId) {
            dispatch(getOwner(ownerId))
        }
        if (location.pathname.indexOf('logements/') !== -1 && !housing && housingId) {
            dispatch(getHousing(housingId))
        }

        setItems(location.pathname.split('/')
            .map(value => {
                if (value === getUserNavItem(UserNavItems.Dashboard).url.substr(1) || value === '') {
                    return getUserNavItem(UserNavItems.Dashboard)
                } else if (value === getUserNavItem(UserNavItems.HousingList).url.substr(1)) {
                    return getUserNavItem(UserNavItems.HousingList)
                } else if (value === getUserNavItem(UserNavItems.Campaign).url.substr(1)) {
                    return getUserNavItem(UserNavItems.Campaign)
                } else if (value === getUserNavItem(UserNavItems.User).url.substr(1)) {
                    return getUserNavItem(UserNavItems.User)
                } else if (value.indexOf('C') === 0 && campaignBundle) {
                    return {
                        url: '/campagnes/' + campaignBundleIdUrlFragment(getCampaignBundleId(campaignBundle)),
                        label: campaignName(campaignBundle.kind, campaignBundle.startMonth, campaignBundle.campaignNumber, campaignBundle.reminderNumber)
                    }
                } else if (value.indexOf('proprietaires') !== -1 && owner) {
                    return {
                        url: location.pathname.substr(0, location.pathname.indexOf(ownerId) + ownerId.length),
                        label: owner.fullName
                    }
                } else if (value.indexOf('logements') !== -1 && housing) {
                    return {
                        url: location.pathname.substr(0, location.pathname.indexOf(housingId) + housingId.length),
                        label: housing.rawAddress.join(' - ')
                    }
                } else {
                    return {url: '', label: ''}
                }
            })
            .filter(_ => _.label !== '')
        )
    }, [location, campaignBundle, owner, housing])

    return (
        <Breadcrumb className="fr-mt-0 fr-pt-3w fr-mb-2w">
            {items.map((item, index) =>
                index < items.length -1 ?
                    <BreadcrumbItem href={item.url}
                                    key={item.label}
                                    data-testid="nav-item">
                        {item.label}
                    </BreadcrumbItem> :
                    <BreadcrumbItem key={item.label}>
                        {item.label}
                    </BreadcrumbItem>
            )}
        </Breadcrumb>
    );
};

export default AppBreadcrumb;

