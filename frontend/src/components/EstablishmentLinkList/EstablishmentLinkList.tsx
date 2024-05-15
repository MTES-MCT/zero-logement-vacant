import { Title } from '../_dsfr';
import { Establishment, getEstablishmentUrl } from '../../models/Establishment';
import styles from './establisment-link-list.module.scss';
import { Link } from 'react-router-dom';

interface Props {
  establishments: Establishment[];
  title: string;
  address?: string;
}

const EstablishmentLinkList = ({ establishments, title, address }: Props) => {
  return (
    <section className="fr-mt-6w">
      <Title as="h2" look="h4" spacing="mb-0">
        {title}
      </Title>
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
