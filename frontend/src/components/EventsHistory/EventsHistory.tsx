import React, { useState } from 'react';
import { Text } from '@dataesr/react-dsfr';
import styles from './events-history.module.scss';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Event } from '../../models/Event';
import { useGetUserQuery } from '../../services/user.service';
import { useEstablishments } from '../../hooks/useEstablishments';

interface EventUserProps {
  userId: string;
}

const EventUser = ({ userId }: EventUserProps) => {
  const { availableEstablishments } = useEstablishments();

  const { data: user } = useGetUserQuery(userId);

  const establishment = availableEstablishments?.find(
    (_) => _.id === user?.establishmentId
  );

  if (!user) {
    return <></>;
  }

  return (
    <span className="color-bf525">
      <span className="ri-user-fill" aria-hidden="true" /> {user.firstName} 
      {user.lastName}
      {establishment && <> ({establishment.name})</>}
    </span>
  );
};

interface Props {
  events: Event[];
}

const EventsHistory = ({ events }: Props) => {
  const [expandEvents, setExpandEvents] = useState(false);

  return (
    <>
      {events && (
        <>
          {events
            .filter((event, index) => expandEvents || index < 3)
            .map((event) => {
              return (
                <div key={event.id} className="fr-mb-3w">
                  <span className={styles.eventDate}>
                    {format(event.createdAt, 'dd MMMM yyyy, HH:mm', {
                      locale: fr,
                    })}
                  </span>
                   par 
                  <EventUser userId={event.createdBy} />
                  <div className={styles.event}>
                    <Text size="md" bold spacing="mb-0">
                      {event.title}
                    </Text>
                    {event.content !== event.title && (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: event.content ?? '',
                        }}
                        className={styles.eventContent}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          {!expandEvents && events.length > 3 && (
            <button
              className="ds-fr--inline fr-link"
              type="button"
              title="Voir tout le suivi"
              onClick={() => setExpandEvents(!expandEvents)}
            >
              Voir tout le suivi
              <span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
            </button>
          )}
        </>
      )}
    </>
  );
};

export default EventsHistory;
