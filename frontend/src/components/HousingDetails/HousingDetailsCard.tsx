import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { skipToken } from '@reduxjs/toolkit/query';
import { Occupancy } from '@zerologementvacant/models';
import classNames from 'classnames';
import { ReactNode, useState } from 'react';
import { match, Pattern } from 'ts-pattern';

import { useUser } from '../../hooks/useUser';
import { Campaign } from '../../models/Campaign';
import { Event } from '../../models/Event';
import {
  formatOwnershipKind,
  getBuildingLocation,
  Housing
} from '../../models/Housing';
import { CADASTRAL_CLASSIFICATION_OPTIONS } from '../../models/HousingFilters';
import { Note } from '../../models/Note';
import { useGetBuildingQuery } from '../../services/building.service';
import { useFindPerimetersQuery } from '../../services/perimeter.service';
import AppLink from '../_app/AppLink/AppLink';
import DPE from '../DPE/DPE';
import EventsHistory from '../EventsHistory/EventsHistory';
import OccupancyBadge from '../Housing/OccupancyBadge';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import LabelNext from '../Label/LabelNext';
import Map from '../Map/Map';
import styles from './housing-details-card.module.scss';
import HousingDetailsSubCardBuilding from './HousingDetailsSubCardBuilding';
import HousingDetailsSubCardLocation from './HousingDetailsSubCardLocation';
import HousingDetailsCardMobilisation from './HousingDetailsSubCardMobilisation';
import HousingDetailsCardOccupancy from './HousingDetailsSubCardOccupancy';
import HousingDetailsSubCardProperties from './HousingDetailsSubCardProperties';

interface Props {
  housing: Housing;
  housingEvents: Event[];
  housingNotes: Note[];
  housingCampaigns: Campaign[];
}

interface HousingDetailsCardProps {
  housing: Housing;
}

function HousingDetailsCard(props: HousingDetailsCardProps) {
  return (
    <Tabs
      tabs={[
        {
          label: 'Logement et bâtiment',
          content: HousingTab({ housing: props.housing }),
          isDefault: true
        }
      ]}
    />
  );
}

interface HousingTabProps {
  housing: Housing;
}

function HousingTab(props: HousingTabProps) {
  const getBuildingQuery = useGetBuildingQuery(
    props.housing.buildingId ?? skipToken
  );
  const findPerimetersQuery = useFindPerimetersQuery();
  // props.housing.geoPerimeters?.length
  //   ? { id: props.housing.geoPerimeters }
  //   : skipToken

  const buildingLocation = getBuildingLocation(props.housing);
  const addressComplement: string | null = buildingLocation
    ? [
        buildingLocation.building,
        buildingLocation.entrance,
        buildingLocation.level,
        buildingLocation.local
      ].join(', ')
    : null;

  return (
    <Grid component="section" container columnSpacing="1.75rem">
      <Grid
        component="section"
        rowGap="2rem"
        sx={{ display: 'flex', flexFlow: 'column nowrap' }}
        xs={4}
      >
        <Stack component="article" spacing="0.75rem">
          <Typography component="h3" variant="h6">
            Informations sur le logement
          </Typography>

          <HousingAttribute label="Type" value={props.housing.housingKind} />
          <HousingAttribute
            label="Surface"
            value={
              !props.housing.livingArea
                ? null
                : `${props.housing.livingArea} m²`
            }
          />
          <HousingAttribute label="Pièces" value={props.housing.roomsCount} />
          <HousingAttribute
            label="Classement cadastral"
            value={
              !props.housing.cadastralClassification
                ? null
                : CADASTRAL_CLASSIFICATION_OPTIONS[
                    props.housing.cadastralClassification
                  ].label
            }
          />
          <HousingAttribute
            label="Étiquette DPE représentatif (CSTB)"
            value={
              !props.housing.energyConsumption ? null : (
                <DPE value={props.housing.energyConsumption} />
              )
            }
          />
          <HousingAttribute
            label="Taxe sur la vacance"
            value={match(props.housing.taxed)
              .with(true, () => <Tag small>Oui</Tag>)
              .with(false, () => <Tag small>Non</Tag>)
              .otherwise(() => null)}
          />
          <HousingAttribute
            label="Identifiant fiscal départemental"
            value={props.housing.invariant}
          />
        </Stack>

        <Stack component="article" spacing="0.75rem">
          <Typography component="h3" variant="h6">
            Informations sur le bâtiment
          </Typography>

          <HousingAttribute
            label="Date de construction"
            value={props.housing.buildingYear}
          />
          <HousingAttribute
            label="Type de propriété"
            value={formatOwnershipKind(props.housing.ownershipKind)}
          />
          <HousingAttribute
            label="Nombre de logements"
            value={match(getBuildingQuery)
              .returnType<ReactNode>()
              .with({ isLoading: true }, () => (
                <Skeleton animation="wave" variant="text" />
              ))
              .with(
                { isLoading: false, data: Pattern.nonNullable },
                ({ data: building }) => building.housingCount
              )
              .otherwise(() => null)}
          />
          <HousingAttribute
            label="Taux de vacance"
            value={match(getBuildingQuery)
              .returnType<ReactNode>()
              .with({ isLoading: true }, () => (
                <Skeleton animation="wave" variant="text" />
              ))
              .with(
                { isLoading: false, data: Pattern.nonNullable },
                ({ data: building }) =>
                  `${Math.round((100 * building.vacantHousingCount) / building.housingCount)} %`
              )
              .otherwise(() => null)}
          />
        </Stack>
      </Grid>

      <Grid
        component="section"
        rowGap="2rem"
        sx={{ display: 'flex', flexFlow: 'column nowrap' }}
        xs={8}
      >
        <Stack component="article" spacing="0.75rem">
          <Typography component="h3" variant="h6">
            Localisation
          </Typography>

          <Grid container columnSpacing="0.5rem">
            <Grid xs={6}>
              <HousingAttribute
                label="Référence cadastrale"
                value={props.housing.cadastralReference}
              />
            </Grid>
            <Grid xs={6} sx={{ textAlign: 'end' }}>
              <HousingAttribute
                label="Complément d’adresse"
                value={addressComplement}
              />
            </Grid>
          </Grid>

          <Map
            housingList={[props.housing]}
            showMapSettings={false}
            maxZoom={10}
            style={{ minHeight: '21rem' }}
          />
          <Stack component="section" sx={{ alignItems: 'flex-end' }}>
            <AppLink
              title="Voir le bâtiment - nouvelle fenêtre"
              to={`https://www.google.com/maps/place/${props.housing.latitude},${props.housing.longitude}`}
              target="_blank"
              iconPosition="left"
              className={classNames(styles.link, 'fr-link')}
            >
              Voir le bâtiment
            </AppLink>
          </Stack>

          <HousingAttribute
            label="Périmètres"
            value={match(findPerimetersQuery)
              .returnType<ReactNode>()
              .with({ isLoading: true }, () => (
                <Skeleton animation="wave" variant="text" />
              ))
              .with(
                { isLoading: false, data: Pattern.nonNullable },
                ({ data: perimeters }) => (
                  <HousingAttribute
                    label="Périmètres"
                    value={perimeters.map((perimeter) => (
                      <Typography key={perimeter.id}>
                        {perimeter.name}
                      </Typography>
                    ))}
                  />
                )
              )
              .otherwise(() => null)}
          />
        </Stack>

        <Stack component="article" spacing="0.75rem">
          <Typography component="h3" variant="h6">
            Vie du logement
          </Typography>

          <HousingAttribute
            label="Occupation actuelle"
            value={
              <OccupancyBadge
                occupancy={props.housing.occupancy as Occupancy}
              />
            }
          />
          <HousingAttribute
            label="Année de début de vacance déclarée"
            value={
              !props.housing.vacancyStartYear ? null : (
                <Typography>
                  {props.housing.vacancyStartYear} (
                  {`${new Date().getUTCFullYear() - props.housing.vacancyStartYear} ans`}
                  )
                </Typography>
              )
            }
          />
          <HousingAttribute
            label="Occupation prévisionnelle"
            value={
              !props.housing.occupancyIntended ? null : (
                <OccupancyBadge
                  occupancy={props.housing.occupancyIntended as Occupancy}
                />
              )
            }
          />
          <HousingAttribute
            label="Dernière mutation"
            value="Vente le 10/03/2023 (345 000 euros) TODO"
          />
        </Stack>
      </Grid>
    </Grid>
  );
}

interface HousingAttributeProps {
  label: string;
  value: ReactNode;
}

function HousingAttribute(props: HousingAttributeProps) {
  return (
    <Stack>
      <LabelNext sx={{ fontWeight: 700 }}>{props.label}</LabelNext>
      {match(props.value)
        .with(Pattern.union(Pattern.string, Pattern.number), (value) => (
          <Typography>{value}</Typography>
        ))
        .with(Pattern.nullish, () => (
          <Typography
            sx={{ color: fr.colors.decisions.text.disabled.grey.default }}
          >
            Pas d’information
          </Typography>
        ))
        .otherwise((value) => value)}
    </Stack>
  );
}

function HousingDetailsCardOld({
  housing,
  housingEvents,
  housingNotes,
  housingCampaigns
}: Props) {
  const { isVisitor } = useUser();
  const [isHousingListEditionExpand, setIsHousingListEditionExpand] =
    useState(false);

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
            lastOccupancyEvent={
              housing.source !== 'datafoncier-import'
                ? housingEvents.find(
                    (event) =>
                      event.category === 'Followup' &&
                      event.kind === 'Update' &&
                      event.section === 'Situation' &&
                      event.name === "Modification du statut d'occupation" &&
                      event.old.occupancy !== event.new.occupancy
                  )
                : housingEvents.find(
                    (event) =>
                      event.category === 'Group' &&
                      event.kind === 'Create' &&
                      event.section === 'Ajout d’un logement dans un groupe' &&
                      event.name === 'Ajout dans un groupe'
                  )
            }
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
                label: 'Historique et notes',
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
