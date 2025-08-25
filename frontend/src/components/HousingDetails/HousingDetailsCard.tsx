import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { fromHousing, Occupancy } from '@zerologementvacant/models';
import classNames from 'classnames';
import { ReactNode, useId } from 'react';
import { match, Pattern } from 'ts-pattern';

import {
  formatOwnershipKind,
  getBuildingLocation,
  Housing,
  lastUpdate
} from '../../models/Housing';
import { CADASTRAL_CLASSIFICATION_OPTIONS } from '../../models/HousingFilters';
import { toString as toMutationString } from '../../models/Mutation';
import { useGetBuildingQuery } from '../../services/building.service';
import { useFindCampaignsQuery } from '../../services/campaign.service';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import { useFindNotesByHousingQuery } from '../../services/note.service';
import { useFindPerimetersQuery } from '../../services/perimeter.service';
import { age } from '../../utils/dateUtils';
import AppLink from '../_app/AppLink/AppLink';
import DPE from '../DPE/DPE';
import EventsHistory from '../EventsHistory/EventsHistory';
import OccupancyBadge from '../Housing/OccupancyBadge';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import LabelNext from '../Label/LabelNext';
import Map from '../Map/Map';
import PrecisionLists from '../Precision/PrecisionLists';
import styles from './housing-details-card.module.scss';

interface HousingDetailsCardProps {
  housing: Housing | undefined;
}

function HousingDetailsCard(props: HousingDetailsCardProps) {
  if (!props.housing) {
    return (
      <Skeleton
        animation="wave"
        variant="rectangular"
        width="100%"
        height="60rem"
      />
    );
  }

  return (
    <Tabs
      tabs={[
        {
          label: 'Logement et bâtiment',
          content: <HousingTab housing={props.housing} />,
          isDefault: true
        },
        {
          label: 'Mobilisation',
          content: <MobilizationTab housing={props.housing} />
        },
        {
          label: 'Historique et notes',
          content: <HistoryTab housing={props.housing} />
        }
      ]}
    />
  );
}

interface TabProps {
  housing: Housing;
}

function HousingTab(props: TabProps) {
  const isHouse = props.housing.housingKind === 'MAISON';
  const getBuildingQuery = useGetBuildingQuery(
    props.housing.buildingId ?? skipToken,
    { skip: isHouse }
  );
  const findPerimetersQuery = useFindPerimetersQuery(undefined, {
    skip: !props.housing.geoPerimeters?.length
  });

  const buildingLocation = getBuildingLocation(props.housing);
  const addressComplement: string | null = buildingLocation
    ? [
        buildingLocation.building,
        buildingLocation.entrance,
        buildingLocation.level,
        buildingLocation.local
      ].join(', ')
    : null;

  const years = props.housing.vacancyStartYear
    ? age(props.housing.vacancyStartYear.toString())
    : null;

  const mutation = fromHousing(props.housing);
  const lastMutation = mutation ? toMutationString(mutation) : null;

  return (
    <Grid component="section" container columnSpacing="1.75rem">
      <Grid
        component="section"
        rowGap="2rem"
        sx={{ display: 'flex', flexFlow: 'column nowrap' }}
        size={4}
      >
        <Stack component="article" spacing="0.75rem">
          <Typography
            component="h3"
            variant="body1"
            sx={{ fontSize: '1.125rem', fontWeight: 700 }}
          >
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
          <Typography
            component="h3"
            variant="body1"
            sx={{ fontSize: '1.125rem', fontWeight: 700 }}
          >
            Informations sur le bâtiment
          </Typography>

          <HousingAttribute
            label="Date de construction"
            value={props.housing.buildingYear}
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
            fallback={isHouse ? 'Pas applicable' : 'Pas d’information'}
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
            fallback={isHouse ? 'Pas applicable' : 'Pas d’information'}
          />
        </Stack>
      </Grid>
      <Grid
        component="section"
        rowGap="2rem"
        sx={{ display: 'flex', flexFlow: 'column nowrap' }}
        size={8}
      >
        <Stack component="article" spacing="0.75rem">
          <Typography
            component="h3"
            variant="body1"
            sx={{ fontSize: '1.125rem', fontWeight: 700 }}
          >
            Localisation
          </Typography>

          <Grid container columnSpacing="0.5rem">
            <Grid size={6}>
              <HousingAttribute
                label="Référence cadastrale"
                value={props.housing.cadastralReference}
              />
            </Grid>
            <Grid sx={{ textAlign: 'end' }} size={6}>
              <HousingAttribute
                label="Complément d’adresse"
                value={addressComplement}
              />
            </Grid>
          </Grid>

          {!props.housing.latitude || !props.housing.longitude ? null : (
            <>
              <Map
                housingList={[props.housing]}
                showMapSettings={false}
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
                    ({ data: perimeters }) => {
                      const result = perimeters
                        .filter((perimeter) => {
                          return props.housing.geoPerimeters?.some(
                            (housingPerimeter) => {
                              return housingPerimeter === perimeter.kind;
                            }
                          );
                        })
                        .map((perimeter) => (
                          <Typography key={perimeter.id}>
                            {perimeter.name}
                          </Typography>
                        ));
                      return result.length > 0 ? result : null;
                    }
                  )
                  .otherwise(() => null)}
                fallback={
                  !props.housing.geoPerimeters?.length
                    ? 'Aucun périmètre'
                    : 'Pas d’information'
                }
              />
            </>
          )}
        </Stack>

        <Stack component="article" spacing="0.75rem">
          <Typography
            component="h3"
            variant="body1"
            sx={{ fontSize: '1.125rem', fontWeight: 700 }}
          >
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
                  {`${years} an${years && years >= 2 ? 's' : ''}`})
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
          <HousingAttribute label="Dernière mutation" value={lastMutation} />
        </Stack>
      </Grid>
    </Grid>
  );
}

function MobilizationTab(props: TabProps) {
  const findCampaignsQuery = useFindCampaignsQuery();

  const updated = lastUpdate(props.housing);

  return (
    <Stack component="section" spacing="2rem">
      <Stack component="article" spacing="0.75rem">
        <Typography
          component="h3"
          variant="body1"
          sx={{ fontSize: '1.125rem', fontWeight: 700 }}
        >
          Informations sur la mobilisation
        </Typography>

        <HousingAttribute
          label="Statut de suivi"
          value={<HousingStatusBadge inline status={props.housing.status} />}
        />
        <HousingAttribute
          label="Sous-statut de suivi"
          value={props.housing.subStatus}
          fallback="Pas applicable"
        />
        <HousingAttribute
          label="Dernière mise à jour"
          value={updated ?? 'Aucune mise à jour'}
        />
        <HousingAttribute
          label={`Campagnes (${props.housing.campaignIds.length})`}
          value={match(findCampaignsQuery)
            .returnType<ReactNode>()
            .with({ isLoading: true }, () => (
              <Skeleton animation="wave" variant="text" />
            ))
            .with(
              { isLoading: false, data: Pattern.nonNullable },
              ({ data: campaigns }) => {
                const housingCampaigns = campaigns.filter((campaign) =>
                  props.housing.campaignIds.includes(campaign.id)
                );
                return housingCampaigns.length === 0 ? (
                  <Typography>Aucune campagne</Typography>
                ) : (
                  housingCampaigns.map((campaign) => (
                    <Typography key={campaign.id}>{campaign.title}</Typography>
                  ))
                );
              }
            )
            .otherwise(() => null)}
        />
      </Stack>

      <Stack component="article">
        <PrecisionLists housingId={props.housing.id} />
      </Stack>
    </Stack>
  );
}

function HistoryTab(props: TabProps) {
  const { data: events, isLoading: isLoadingEvents } =
    useFindEventsByHousingQuery(props.housing.id);
  const { data: notes, isLoading: isLoadingNotes } = useFindNotesByHousingQuery(
    props.housing.id
  );

  if (isLoadingEvents || isLoadingNotes) {
    return <Skeleton animation="wave" variant="rectangular" height={200} />;
  }

  return <EventsHistory events={events ?? []} notes={notes ?? []} />;
}

interface HousingAttributeProps {
  label: string;
  value: ReactNode;
  /**
   * @default 'Pas d’information'
   */
  fallback?: string;
}

function HousingAttribute(props: HousingAttributeProps) {
  const label = useId();
  const fallback = props.fallback ?? 'Pas d’information';

  return (
    <Stack>
      <LabelNext id={label} sx={{ fontWeight: 700 }}>
        {props.label}
      </LabelNext>
      {match(props.value)
        .with(Pattern.union(Pattern.string, Pattern.number), (value) => (
          <Typography aria-labelledby={label}>{value}</Typography>
        ))
        .with(Pattern.nullish, () => (
          <Typography aria-labelledby={label}>{fallback}</Typography>
        ))
        .otherwise((value) => (
          <span aria-labelledby={label}>{value}</span>
        ))}
    </Stack>
  );
}

export default HousingDetailsCard;
