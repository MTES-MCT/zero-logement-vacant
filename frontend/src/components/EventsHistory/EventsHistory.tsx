import React, { useState } from 'react';
import { Text } from '@dataesr/react-dsfr';
import styles from './events-history.module.scss';
import { differenceInMilliseconds, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Event } from '../../models/Event';
import EventUser from './EventUser';
import EventHousingStatutContent from './EventHousingStatutContent';
import EventHousingOwnerContent from './EventHousingOwnerContent';
import { Note } from '../../models/Note';

interface Props {
  events: Event[];
  notes: Note[];
}

const EventsHistory = ({ events, notes }: Props) => {
  const [expandEvents, setExpandEvents] = useState(false);

  const eventAndNotes = [...events, ...notes].sort((e1, e2) =>
    differenceInMilliseconds(e2.createdAt, e1.createdAt)
  );

  const isEvent = (e: Event | Note): e is Event => {
    return (e as Event).category !== undefined;
  };

  return (
    <>
      {eventAndNotes
        .filter((eventOrNote, index) => expandEvents || index < 3)
        .map((eventOrNote, index) => {
          return (
            <div key={`event_note_${index}`} className="fr-mb-3w">
              <div className={styles.eventData}>
                <span className={styles.eventDate}>
                  {format(eventOrNote.createdAt, 'dd MMMM yyyy, HH:mm', {
                    locale: fr,
                  })}
                </span>
                <span className="fr-mx-1w">par</span>
                <EventUser userId={eventOrNote.createdBy} />
              </div>
              <div className={styles.event}>
                {isEvent(eventOrNote) ? (
                  <>
                    <Text size="md" bold spacing="mb-0">
                      {eventOrNote.name}
                    </Text>
                    {eventOrNote.section === 'Situation' && (
                      <div className={styles.eventContentRowContainer}>
                        <EventHousingStatutContent housing={eventOrNote.old} />
                        {eventOrNote.old && eventOrNote.new && (
                          <span className="fr-icon-arrow-right-s-line" />
                        )}
                        <EventHousingStatutContent housing={eventOrNote.new} />
                      </div>
                    )}
                    {eventOrNote.section === 'Propriétaire' && (
                      <div className={styles.eventContentRowContainer}>
                        <EventHousingOwnerContent
                          housingOwners={eventOrNote.old}
                        />
                        {eventOrNote.old && eventOrNote.new && (
                          <span className="fr-icon-arrow-right-s-line" />
                        )}
                        <EventHousingOwnerContent
                          housingOwners={eventOrNote.new}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Text size="md" bold spacing="mb-0">
                      Note : {eventOrNote.title}
                    </Text>
                    {eventOrNote.content !== eventOrNote.title && (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: eventOrNote.content ?? '',
                        }}
                        className={styles.eventContent}
                      />
                    )}
                  </>
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
  );
};

export default EventsHistory;
