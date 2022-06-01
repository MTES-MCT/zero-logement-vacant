import React, { useState } from 'react';
import { Col, Row, Tag, TagGroup, Title } from '@dataesr/react-dsfr';
import styles from './events-history.module.scss';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCampaignList } from '../../hooks/useCampaignList';
import { Event } from '../../models/Event';
import { Housing } from '../../models/Housing';


const EventsHistory = ({ events, housingList }: { events: Event[], housingList?: Housing[]}) => {

    const campaignList = useCampaignList();

    const [expandEvents, setExpandEvents] = useState(false);

    const housingNumber = (housingId: string) => housingList ? housingList.findIndex(h => h.id === housingId) + 1 : 1;

    return (
        <>
            <Row>
                <Col>
                    <Title as="h2" look="h3">Historique du dossier</Title>
                </Col>
            </Row>
            {events &&
                <>
                    <ul className={styles.ownerEvents}>
                        {events
                            .filter((event, index) => expandEvents || index < 3)
                            .map(event =>
                                <li key={event.id}>
                                    <div className={styles.ownerEvent}>
                                        <TagGroup>
                                            <Tag as="span"
                                                 size="sm">
                                                {format(event.createdAt, 'dd MMMM yyyy', { locale: fr })}
                                            </Tag>
                                        </TagGroup>
                                        {housingList && event.housingId &&
                                            <div>
                                                <b>{housingNumber(event.housingId) ? 'Logement ' + housingNumber(event.housingId) : 'Ancien logement'}</b>
                                            </div>
                                        }
                                        <div className="fr-mb-0">
                                            {event.campaignId && `"${campaignList?.find(campaign => campaign.id === event.campaignId)?.name}"`}
                                            {event.campaignId && (event.contactKind || event.content) ? ': ' : ''}
                                            {event.contactKind && `${event.contactKind}. `}{event.content}
                                        </div>
                                    </div>
                                </li>
                            )
                        }
                    </ul>
                    {!expandEvents && events.length > 3 &&
                        <button className="ds-fr--inline fr-link"
                                type="button"
                                title="Voir tout le suivi"
                                onClick={() => setExpandEvents(!expandEvents)}>
                            Voir tout le suivi<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                        </button>
                    }
                </>
            }
        </>
    );
};

export default EventsHistory;

