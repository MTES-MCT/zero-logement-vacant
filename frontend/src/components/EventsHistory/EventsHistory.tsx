import React, { useState } from 'react';
import { Text } from '../_dsfr';
import styles from './events-history.module.scss';
import { differenceInMilliseconds, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Event } from '../../models/Event';
import EventUser from './EventUser';
import EventPartialHousingContent from './EventPartialHousingContent';
import EventHousingOwnerContent from './EventHousingOwnerContent';
import { Note } from '../../models/Note';
import classNames from 'classnames';
import { getHousingDiff, getOwnerDiff } from '../../models/Diff';
import EventPartialOwnerContent from './EventPartialOwnerContent';
import { useCampaignList } from '../../hooks/useCampaignList';
import AppLink from '../_app/AppLink/AppLink';
import { Campaign, campaignBundleIdUrlFragment } from '../../models/Campaign';
import GroupEventContent from './GroupEventContent';

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

  const campaignList = useCampaignList();
  const findNewCampaign = (event: Event): Campaign =>
    event.new.campaignIds?.[0] &&
    campaignList?.find(
      (campaing) => campaing.id === event.new.campaignIds?.[0]
    );

  return (
    <>
      {eventAndNotes
        .filter((eventOrNote, index) => expandEvents || index < 3)
        .map((eventOrNote, index) => (
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
                  {(eventOrNote.section === 'Situation' ||
                    eventOrNote.name === 'Changement de statut de suivi') && (
                    <div className={styles.eventContentRowContainer}>
                      {eventOrNote.old ? (
                        <>
                          <EventPartialHousingContent
                            partialHousing={
                              getHousingDiff(
                                eventOrNote.old,
                                eventOrNote.new ?? {}
                              ).old
                            }
                          />
                          {eventOrNote.conflict ? (
                            <span className="fr-icon-error-warning-fill color-red-marianne-625" />
                          ) : (
                            <span className="fr-icon-arrow-right-s-line" />
                          )}
                          {eventOrNote.new ? (
                            <EventPartialHousingContent
                              partialHousing={
                                getHousingDiff(eventOrNote.old, eventOrNote.new)
                                  .new
                              }
                            />
                          ) : (
                            <div
                              className={classNames(
                                styles.eventContent,
                                'd-inline-block'
                              )}
                            >
                              Ce logement <b>n'est plus présent</b> dans Lovac
                            </div>
                          )}
                        </>
                      ) : (
                        <div
                          className={classNames(
                            styles.eventContent,
                            'd-inline-block'
                          )}
                        >
                          {eventOrNote.new ? (
                            <>
                              Ce logement est <b>nouveau</b> dans Lovac
                            </>
                          ) : (
                            <>
                              Ce logement <b>n'est plus présent</b> dans Lovac
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {eventOrNote.category === 'Ownership' && (
                    <>
                      {eventOrNote.section === 'Propriétaire' && (
                        <div className={styles.eventContentRowContainer}>
                          {eventOrNote.name ===
                          "Création d'un nouveau propriétaire" ? (
                            <EventHousingOwnerContent
                              housingOwners={[eventOrNote.new]}
                            />
                          ) : (
                            <>
                              {eventOrNote.old && (
                                <EventHousingOwnerContent
                                  housingOwners={
                                    eventOrNote.old.owner
                                      ? [eventOrNote.old.owner]
                                      : eventOrNote.old
                                  }
                                />
                              )}
                              <>
                                {eventOrNote.conflict ? (
                                  <span className="fr-icon-error-warning-fill color-red-marianne-625" />
                                ) : (
                                  <span className="fr-icon-arrow-right-s-line" />
                                )}
                              </>
                              {eventOrNote.new ? (
                                <EventHousingOwnerContent
                                  housingOwners={
                                    eventOrNote.new.owner
                                      ? [eventOrNote.new.owner]
                                      : eventOrNote.new
                                  }
                                />
                              ) : (
                                <div
                                  className={classNames(
                                    styles.eventContent,
                                    'd-inline-block'
                                  )}
                                >
                                  Ce logement <b>n'est plus présent</b> dans
                                  Lovac
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {eventOrNote.section === 'Coordonnées propriétaire' && (
                        <div className={styles.eventContentRowContainer}>
                          <EventPartialOwnerContent
                            partialOwner={
                              getOwnerDiff(eventOrNote.old, eventOrNote.new).old
                            }
                            ownerName={eventOrNote.old.fullName}
                            eventName={eventOrNote.name}
                          />
                          <span className="fr-icon-arrow-right-s-line" />
                          <EventPartialOwnerContent
                            partialOwner={
                              getOwnerDiff(eventOrNote.old, eventOrNote.new).new
                            }
                            ownerName={eventOrNote.new.fullName}
                            eventName={eventOrNote.name}
                          />
                        </div>
                      )}
                    </>
                  )}
                  {eventOrNote.category === 'Campaign' &&
                    eventOrNote.name === 'Ajout dans une campagne' && (
                      <div
                        className={classNames(
                          styles.eventContent,
                          'd-inline-block'
                        )}
                      >
                        Ce logement a été <b>ajouté dans une campagne</b>{' '}
                        {findNewCampaign(eventOrNote) && (
                          <AppLink
                            to={
                              '/campagnes/' +
                              campaignBundleIdUrlFragment({
                                campaignNumber:
                                  findNewCampaign(eventOrNote).campaignNumber,
                                reminderNumber:
                                  findNewCampaign(eventOrNote).reminderNumber,
                              })
                            }
                            isSimple
                            iconId="fr-icon-mail-fill"
                            iconPosition="left"
                          >
                            {findNewCampaign(eventOrNote).title}
                          </AppLink>
                        )}
                      </div>
                    )}
                  {eventOrNote.category === 'Group' && (
                    <GroupEventContent event={eventOrNote} />
                  )}
                </>
              ) : (
                <>
                  <Text size="md" bold spacing="mb-0">
                    Note
                  </Text>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: eventOrNote.content.replaceAll(
                        /(\n|\\n)/g,
                        '<br />'
                      ),
                    }}
                    className={styles.eventContent}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      {!expandEvents && eventAndNotes.length > 3 && (
        <button
          className="ds-fr--inline fr-link"
          type="button"
          title="Voir tout le suivi"
          onClick={() => setExpandEvents(!expandEvents)}
        >
          Voir tout le suivi
          <span className="fr-icon-1x icon-right fr-icon-arrow-right-line ds-fr--v-middle" />
        </button>
      )}
    </>
  );
};

export default EventsHistory;
