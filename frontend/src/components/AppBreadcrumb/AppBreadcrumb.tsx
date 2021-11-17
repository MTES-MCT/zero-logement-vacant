import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem } from '@dataesr/react-dsfr';
import { useLocation } from 'react-router-dom';
import { getUserNavItem, UserNavItem, UserNavItems } from '../../models/UserNavItem';


const AppBreadcrumb = ( { additionalItems }: { additionalItems? : UserNavItem[] }) => {

    const location = useLocation();
    const [items, setItems] = useState<UserNavItem[]>([getUserNavItem(UserNavItems.Dashboard)]);

    useEffect(() => {
        if (location.pathname.indexOf(getUserNavItem(UserNavItems.Campaign).url) !== -1) {
            setItems([
                getUserNavItem(UserNavItems.Dashboard),
                getUserNavItem(UserNavItems.Campaign),
                ...additionalItems ?? []]
            )
        }
        if (location.pathname.indexOf(getUserNavItem(UserNavItems.HousingList).url) !== -1) {
            setItems([
                getUserNavItem(UserNavItems.Dashboard),
                getUserNavItem(UserNavItems.HousingList),
                ...additionalItems ?? []]
            )
        }
    }, [location, additionalItems])

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

