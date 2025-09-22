import SideMenu, { type SideMenuProps } from '@codegouvfr/react-dsfr/SideMenu';
import { useLocation } from 'react-router-dom';

function AccountSideMenu() {
  const location = useLocation();
  interface CreateLinkOptions {
    text: string;
    to: string;
  }

  function createLink(options: CreateLinkOptions): SideMenuProps.Item.Link {
    return {
      text: options.text,
      linkProps: {
        to: {
          pathname: options.to
        }
      },
      isActive: location.pathname === options.to
    };
  }

  interface CreateSubMenuOptions {
    text: string;
    items: SideMenuProps.Item[];
  }

  function createSubMenu(
    options: CreateSubMenuOptions
  ): SideMenuProps.Item.SubMenu {
    return {
      text: options.text,
      items: options.items
    };
  }

  const menuItems: SideMenuProps.Item[] = [
    createLink({
      text: 'Gérer mon profil',
      to: '/compte'
    }),
    createSubMenu({
      text: 'Mes établissements',
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
