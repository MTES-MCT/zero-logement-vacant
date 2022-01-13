import React, { useEffect, useState } from 'react';
import { Col, Row, Tag, Title, TagGroup } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from './owner.module.scss';
import { format } from 'date-fns';
import { getOwnerEvents } from '../../store/actions/ownerAction';
import { fr } from 'date-fns/locale';
import { listCampaigns } from '../../store/actions/campaignAction';


const OwnerEvents = ({ ownerId }: { ownerId: string}) => {

    const dispatch = useDispatch();

    // const [isModalOpen, setIsModalOpen] = useState(false);

    const [expandEvents, setExpandEvents] = useState(false);
    const { events, housingList } = useSelector((state: ApplicationState) => state.owner);
    const { campaignList } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        dispatch(getOwnerEvents(ownerId));
    }, [dispatch])

    useEffect(() => {
        if (!campaignList) {
            dispatch(listCampaigns())
        }
    },[campaignList])

    return (
        <>
            <Row>
                <Col>
                    <Title as="h2" look="h3">Historique du dossier</Title>
                </Col>
                {/*<Col n="5">*/}
                {/*    <Button title="Ajouter un événement"*/}
                {/*            secondary*/}
                {/*            size="sm"*/}
                {/*            icon="fr-fi-add-line"*/}
                {/*            className="float-right"*/}
                {/*            onClick={() => {setIsModalOpen(true)}}>*/}
                {/*        Ajouter un événement*/}
                {/*    </Button>*/}
                {/*    {isModalOpen &&*/}
                {/*    <EventCreationModal onSubmit={() => {}}*/}
                {/*                        onClose={() => setIsModalOpen(false)} />*/}
                {/*    }*/}
                {/*</Col>*/}
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
                                        {event.housingId &&
                                            <div>
                                                <b>Logement {housingList.findIndex(h => h.id === event.housingId) + 1}</b>
                                            </div>
                                        }
                                        <div className="fr-mb-0">
                                            {event.campaignId && `"${campaignList?.find(campaign => campaign.id === event.campaignId)?.name}": `}
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

export default OwnerEvents;

