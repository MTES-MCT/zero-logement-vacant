import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Card from '@codegouvfr/react-dsfr/Card';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import classNames from 'classnames';
import { useState } from 'react';

import styles from './housing-details-card.module.scss';
import { Housing, HousingUpdate } from '../../models/Housing';
import HousingDetailsSubCardBuilding from './HousingDetailsSubCardBuilding';
import HousingDetailsSubCardProperties from './HousingDetailsSubCardProperties';
import HousingDetailsSubCardLocation from './HousingDetailsSubCardLocation';
import EventsHistory from '../EventsHistory/EventsHistory';
import { Event } from '../../models/Event';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import { useFindNotesByHousingQuery } from '../../services/note.service';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import { Note } from '../../models/Note';
import HousingDetailsCardOccupancy from './HousingDetailsSubCardOccupancy';
import HousingDetailsCardMobilisation from './HousingDetailsSubCardMobilisation';
import { Campaign } from '../../models/Campaign';
import { useUpdateHousingMutation } from '../../services/housing.service';
import AppLink from '../_app/AppLink/AppLink';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../models/TrackEvent';
import { useUser } from '../../hooks/useUser';

interface Props {
  housing: Housing;
  housingEvents: Event[];
  housingNotes: Note[];
  housingCampaigns: Campaign[];
}

function HousingDetailsCard({
  housing,
  housingEvents,
  housingNotes,
  housingCampaigns
}: Props) {
  const { isVisitor } = useUser();
  const { trackEvent } = useMatomo();
  const [updateHousing] = useUpdateHousingMutation();

  const [isHousingListEditionExpand, setIsHousingListEditionExpand] =
    useState(false);

  const { refetch: refetchHousingEvents } = useFindEventsByHousingQuery(
    housing.id
  );
  const { refetch: refetchHousingNotes } = useFindNotesByHousingQuery(
    housing.id
  );

  const submitHousingUpdate = async (
    housing: Housing,
    housingUpdate: HousingUpdate
  ) => {
    trackEvent({
      category: TrackEventCategories.Housing,
      action: TrackEventActions.Housing.Update
    });
    await updateHousing({
      housing,
      housingUpdate
    });
    await refetchHousingEvents();
    await refetchHousingNotes();

    setIsHousingListEditionExpand(false);
  };

  return (
    <Card
      border={false}
      size="small"
      title={
        <>
          {!isVisitor && (
            <Button
              onClick={() => setIsHousingListEditionExpand(true)}
              className="fr-ml-1w float-right"
            >
              Mettre à jour / Ajouter une note
            </Button>
          )}
          <HousingEditionSideMenu
            housing={housing}
            expand={isHousingListEditionExpand}
            onSubmit={submitHousingUpdate}
            onClose={() => setIsHousingListEditionExpand(false)}
          />
          {!isVisitor && (
            <Typography component="h1" variant="h4" mb={1}>
              {housing.rawAddress.map((line) => (
                <>
                  {line}
                  <br />
                </>
              ))}
              <AppLink
                title="Voir sur la carte - nouvelle fenêtre"
                to={`https://www.google.com/maps/place/${housing.latitude},${housing.longitude}`}
                target="_blank"
                iconPosition="left"
                className={classNames(
                  styles.link,
                  'fr-link',
                  'fr-ml-3w',
                  'float-right'
                )}
              >
                Voir sur la carte
              </AppLink>
            </Typography>
          )}
        </>
      }
      desc={
        <>
          <HousingDetailsCardOccupancy
            housing={housing}
            lastOccupancyEvent={housing.source !== 'datafoncier-import' ? housingEvents.find(
              (event) =>
                event.category === 'Followup' &&
                event.kind === 'Update' &&
                event.section === 'Situation' &&
                event.name === "Modification du statut d'occupation" &&
                event.old.occupancy !== event.new.occupancy
              ) :
              housingEvents.find(
              (event) =>
                event.category === 'Group' &&
                event.kind === 'Create' &&
                event.section === 'Ajout d’un logement dans un groupe' &&
                event.name === "Ajout dans un groupe"
            )}
          />
          <HousingDetailsCardMobilisation
            housing={housing}
            campaigns={housingCampaigns}
          />
          <Tabs
            className="no-border fr-pt-3w"
            tabs={[
              {
                label: 'Caractéristiques',
                content: (
                  <div className="fr-px-0">
                    <Grid container spacing={2}>
                      <Grid xs>
                        <HousingDetailsSubCardProperties
                          className={fr.cx('fr-mb-2w')}
                          housing={housing}
                        />
                        <HousingDetailsSubCardLocation housing={housing} />
                      </Grid>
                      <Grid xs>
                        <HousingDetailsSubCardBuilding housing={housing} />
                      </Grid>
                    </Grid>
                  </div>
                )
              },
              {
                label: 'Historique de suivi',
                content: (
                  <EventsHistory events={housingEvents} notes={housingNotes} />
                )
              }
            ]}
          ></Tabs>
        </>
      }
    ></Card>
  );
}

export default HousingDetailsCard;
