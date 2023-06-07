import { Link, Text } from '@dataesr/react-dsfr';
import React from 'react';
import InternalLink from '../../components/InternalLink/InternalLink';
import { useAppDispatch } from '../../hooks/useStore';
import { logout } from '../../store/actions/authenticationAction';
import { useUser } from '../../hooks/useUser';

const AccountSideMenu = () => {
  const dispatch = useAppDispatch();

  const { establishment } = useUser();

  return (
    <>
      <Text className="color-grey-625" size="sm" bold spacing="mb-0">
        Votre compte
      </Text>
      <div className="fr-py-2w">
        <InternalLink
          to="/compte"
          icon="ri-user-fill"
          iconPosition="left"
          className="fr-link"
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
          target="_blank"
          icon="ri-group-fill"
          iconPosition="left"
        >
          Gérer les utilisateurs via consultdf
        </Link>
      </div>
      <hr className="fr-py-1w" />
      <Link
        href="#"
        icon="ri-login-box-fill"
        iconPosition="left"
        onClick={() => dispatch(logout())}
        size="md"
      >
        Se déconnecter
      </Link>
    </>
  );
};

export default AccountSideMenu;
