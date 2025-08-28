import { fr } from '@codegouvfr/react-dsfr';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { usePostHog } from 'posthog-js/react';
import { useLocation } from 'react-router-dom';

import AppLink from '../../components/_app/AppLink/AppLink';
import { useAppDispatch } from '../../hooks/useStore';
import { useUser } from '../../hooks/useUser';
import { logOut } from '../../store/actions/authenticationAction';

const AccountSideMenu = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { establishment } = useUser();

  const isCurrentLocation = location.pathname === '/compte';

  const posthog = usePostHog();

  function onLogOut() {
    posthog.reset();
    dispatch(logOut());
  }

  return (
    <>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: fr.colors.decisions.text.default.grey.default
        }}
      >
        Votre compte
      </Typography>
      <div className="fr-py-2w">
        <AppLink
          className={classNames('fr-ml-0', { 'weight-700': isCurrentLocation })}
          isSimple={isCurrentLocation}
          to="/compte"
          iconId="fr-icon-user-fill"
          iconPosition="left"
        >
          Gérer votre profil
        </AppLink>
      </div>
      <hr className="fr-py-1w" />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: fr.colors.decisions.text.default.grey.default
        }}
      >
        {establishment?.name}
      </Typography>
      <div className="fr-py-2w">
        <AppLink
          to={{ pathname: 'https://consultdf.cerema.fr/consultdf/' }}
          target="_blank"
          iconId="fr-icon-group-fill"
          iconPosition="left"
        >
          Gérer les utilisateurs (portail DF)
        </AppLink>
      </div>
      <div className="fr-pb-2w">
        <AppLink
          to="/utilisateurs"
          iconId="fr-icon-group-fill"
          iconPosition="left"
        >
          Voir les utilisateurs
        </AppLink>
      </div>
      <div className="fr-pb-2w">
        <AppLink
          to="/autres-etablissements"
          iconId="fr-icon-group-fill"
          iconPosition="left"
        >
          Voir les autres structures
        </AppLink>
      </div>
      <hr className="fr-py-1w" />
      <AppLink
        to="#"
        iconId="fr-icon-logout-box-r-fill"
        iconPosition="left"
        onClick={onLogOut}
        size="md"
      >
        Se déconnecter
      </AppLink>
    </>
  );
};

export default AccountSideMenu;
