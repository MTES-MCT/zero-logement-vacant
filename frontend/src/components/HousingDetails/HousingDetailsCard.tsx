import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Paper from '@mui/material/Paper';
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
    <Paper component="article" elevation={0} sx={{ padding: 3 }}>
      <Grid component="header" container sx={{ mb: 2 }}>
        <Grid xs>
          {!isVisitor && (
            <>
              <Typography component="h1" variant="h4" mb={1}>
                {housing.rawAddress.map((line) => (
                  <>
                    {line}
                    <br />
                  </>
                ))}
              </Typography>
              <AppLink
                title="Voir sur la carte - nouvelle fenêtre"
                to={`https://www.google.com/maps/place/${housing.latitude},${housing.longitude}`}
                target="_blank"
                iconPosition="left"
                className={classNames(styles.link, 'fr-link')}
              >
                Voir sur la carte
              </AppLink>
            </>
          )}
        </Grid>
        <Grid xs="auto">
          {!isVisitor && (
            <>
              <Button onClick={() => setIsHousingListEditionExpand(true)}>
                Mettre à jour / Ajouter une note
              </Button>
              <HousingEditionSideMenu
                housing={housing}
                expand={isHousingListEditionExpand}
                onSubmit={submitHousingUpdate}
                onClose={() => setIsHousingListEditionExpand(false)}
              />
            </>
          )}
        </Grid>
      </Grid>
      <Grid component="section" container>
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
      </Grid>
    </Paper>
  );
}

export default HousingDetailsCard;
