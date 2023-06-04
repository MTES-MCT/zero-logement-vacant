import { Link, Text } from '@dataesr/react-dsfr';
import React from 'react';
import InternalLink from '../../components/InternalLink/InternalLink';
import { useAppDispatch } from '../../hooks/useStore';
import { logout } from '../../store/actions/authenticationAction';
import { useUser } from '../../hooks/useUser';
import { useLocation } from 'react-router-dom';
import classNames from 'classnames';

const AccountSideMenu = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { establishment } = useUser();

  const isCurrentLocation = location.pathname === '/compte';

  return (
    <>
      <Text className="color-grey-625" size="sm" bold spacing="mb-0">
        Votre compte
      </Text>
      <div className="fr-py-2w">
        <InternalLink
          className={classNames('fr-ml-0', { 'weight-700': isCurrentLocation })}
          current={isCurrentLocation}
          isSimple={isCurrentLocation}
          to="/compte"
          display="flex"
          icon="ri-user-fill"
          iconPosition="left"
          iconSize="lg"
        >
          Gérer votre profil
        </InternalLink>
      </div>
      <hr className="fr-py-1w" />
      <Text className="color-grey-625" size="sm" bold spacing="mb-0">
        {establishment?.name}
      </Text>
      <div className="fr-py-2w">
        <Link
          href="https://consultdf.cerema.fr/consultdf/orion-cerema/login"
          display="flex"
          target="_blank"
          icon="ri-group-fill"
          iconPosition="left"
          iconSize="lg"
        >
          Gérer les utilisateurs via consultdf
        </Link>
      </div>
      <hr className="fr-py-1w" />
      <Link
        display="flex"
        href="#"
        icon="ri-login-box-fill"
        iconPosition="left"
        iconSize="lg"
        onClick={() => dispatch(logout())}
        size="md"
      >
        Se déconnecter
      </Link>
    </>
  );
};

export default AccountSideMenu;
