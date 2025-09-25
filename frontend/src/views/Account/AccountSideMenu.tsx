import SideMenu, { type SideMenuProps } from '@codegouvfr/react-dsfr/SideMenu';
import { useLocation } from 'react-router-dom';

import { useUser } from '~/hooks/useUser';

function AccountSideMenu() {
  const location = useLocation();
  const { establishment } = useUser();

  interface CreateLinkOptions {
    text: string;
    to: string;
  }

  function createLink(options: CreateLinkOptions): SideMenuProps.Item.Link {
    const linkProps = options.to.startsWith('http')
      ? {
          href: options.to,
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      : {
          to: {
            pathname: options.to
          }
        };

    return {
      text: options.text,
      linkProps: linkProps,
      isActive: location.pathname === options.to
    };
  }

  interface CreateSubMenuOptions {
    text: string;
    items: SideMenuProps.Item[];
    expandedByDefault?: boolean;
  }

  function createSubMenu(
    options: CreateSubMenuOptions
  ): SideMenuProps.Item.SubMenu {
    return {
      text: options.text,
      items: options.items,
      expandedByDefault: options.expandedByDefault
    };
  }

  const menuItems: SideMenuProps.Item[] = [
    createLink({
      text: 'Gérer mon profil',
      to: '/compte'
    }),
    createSubMenu({
      text: establishment?.name ?? '',
      expandedByDefault: true,
      items: [
        createLink({
          text: 'Utilisateurs rattachés à votre structure',
          to: '/utilisateurs'
        }),
        createLink({
          text: 'Autres structures sur votre territoire',
          to: '/autres-structures'
        })
      ]
    })
  ];

  return (
    <SideMenu burgerMenuButtonText="Menu" items={menuItems} fullHeight sticky />
  );
}

export default AccountSideMenu;
