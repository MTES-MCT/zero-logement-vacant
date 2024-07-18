import { Establishment, getEstablishmentUrl } from '../../models/Establishment';
import styles from './establisment-link-list.module.scss';
import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';

interface Props {
  establishments: Establishment[];
  title: string;
  address?: string;
}

const EstablishmentLinkList = ({ establishments, title, address, }: Props) => {
  return (
    <section className="fr-mt-6w">
      <Typography component="h2" variant="h4" mb={0}>
        {title}
      </Typography>
      <div>
        {establishments.map((establishment) => (
          <Link
            to={`${getEstablishmentUrl(establishment)}${
              address ? `?address=${address}` : ''
            }`}
            className={styles.establishmentLink}
            key={establishment.id}
          >
            {establishment.shortName}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default EstablishmentLinkList;
