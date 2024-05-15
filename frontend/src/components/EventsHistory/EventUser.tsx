import { useAvailableEstablishments } from '../../hooks/useAvailableEstablishments';
import { useGetUserQuery } from '../../services/user.service';
import classNames from 'classnames';
import styles from './events-history.module.scss';

interface Props {
  userId: string;
}

const EventUser = ({ userId }: Props) => {
  const { availableEstablishments } = useAvailableEstablishments();

  const { data: user } = useGetUserQuery(userId);

  const establishment = availableEstablishments?.find(
    (_) => _.id === user?.establishmentId
  );

  if (!user) {
    return <></>;
  }

  return (
    <>
      <span
        className={classNames(styles.eventCreator, 'fr-icon-user-fill')}
        aria-hidden="true"
      />
      <span className={styles.eventCreator}>
        {user.firstName || user.lastName ? (
          <>
            {user.firstName} {user.lastName}
          </>
        ) : (
          user.email
        )}
        {establishment && <> ({establishment.name})</>}
      </span>
    </>
  );
};

export default EventUser;
