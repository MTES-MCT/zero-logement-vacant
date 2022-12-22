import React, { useState } from 'react';
import { Badge, Tag, TagGroup } from '@dataesr/react-dsfr';
import styles from './events-history.module.scss';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCampaignList } from '../../hooks/useCampaignList';
import { Event } from '../../models/Event';
import { Housing } from '../../models/Housing';
import { campaignFullName, getCampaignKindLabel } from '../../models/Campaign';

const EventsHistory = ({
  events,
  housingList,
}: {
  events: Event[];
  housingList?: Housing[];
}) => {
  const campaignList = useCampaignList();

  const [expandEvents, setExpandEvents] = useState(false);

  const housingNumber = (housingId: string) =>
    housingList ? housingList.findIndex((h) => h.id === housingId) + 1 : 1;

  return (
    <>
      {events && (
        <>
          <ul className={styles.ownerEvents}>
            {events
              .filter((event, index) => expandEvents || index < 3)
              .map((event) => {
                const eventCampaign = campaignList?.find(
                  (campaign) => campaign.id === event.campaignId
                );
                return (
                  <li key={event.id}>
                    <div className={styles.ownerEvent}>
                      <TagGroup>
                        <Tag as="span" small>
                          {format(event.createdAt, 'dd MMMM yyyy', {
                            locale: fr,
                          })}
                        </Tag>
                      </TagGroup>
                      {housingList && event.housingId && (
                        <div>
                          <b>
                            {housingNumber(event.housingId)
                              ? 'Logement ' + housingNumber(event.housingId)
                              : 'Ancien logement'}
                          </b>
                        </div>
                      )}
                      <div className="fr-mb-0">
                        {eventCampaign && (
                          <div>
                            <Badge
                              isSmall
                              text={
                                eventCampaign.campaignNumber
                                  ? `Campagne - ${getCampaignKindLabel(
                                      eventCampaign.kind
                                    )}`
                                  : 'Hors campagne'
                              }
                              className="fr-mb-1w"
                            />
                            <br />"{campaignFullName(eventCampaign)}"
                          </div>
                        )}
                        {event.contactKind && `${event.contactKind}. `}
                        <div
                          dangerouslySetInnerHTML={{
                            __html: event.content ?? '',
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
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
