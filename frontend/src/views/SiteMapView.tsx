import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';

interface Route {
  label: string;
  to: string;
  children?: ReadonlyArray<Route>;
}

const routes: ReadonlyArray<Route> = [
  { label: 'Parc de logements', to: '/parc-de-logements' },
  { label: 'Parc vacant de votre territoire', to: '/analyses/parc-vacant' },
  { label: 'Vos suivis et campagnes', to: '/analyses/lutte' },
  { label: 'Vos campagnes', to: '/campagnes' },
  { label: 'Ressources', to: '/ressources' },
  { label: 'Liste des statuts de suivi', to: '/ressources/statuts' },
  { label: 'Gérer mon profil', to: '/compte' },
  { label: 'Utilisateurs rattachés à votre structure', to: '/utilisateurs' },
  { label: 'Autres structures sur votre territoire', to: '/autres-structures' }
];

function formatRoutes(routes: ReadonlyArray<Route>) {
  if (!routes || routes.length === 0) {
    return null;
  }

  return (
    <ul>
      {routes.map((route) => (
        <li key={route.to}>
          <Link to={route.to}>{route.label}</Link>
          {formatRoutes(route.children ?? [])}
        </li>
      ))}
    </ul>
  );
}

function SiteMapView() {
  useDocumentTitle('Plan du site');

  return (
    <Container maxWidth="xl" sx={{ py: '4rem' }}>
      <Typography variant="h1" sx={{ mb: '1.5rem' }}>
        Plan du site
      </Typography>

      {formatRoutes(routes)}
    </Container>
  );
}

export default SiteMapView;
