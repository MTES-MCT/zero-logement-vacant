import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { fromHousing } from '@zerologementvacant/models';
import classNames from 'classnames';
import { type ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';

import {
  formatOwnershipKind,
  getBuildingLocation,
  type Housing
} from '../../models/Housing';
import { CADASTRAL_CLASSIFICATION_OPTIONS } from '../../models/HousingFilters';
import { toString as toMutationString } from '../../models/Mutation';
import { useGetBuildingQuery } from '../../services/building.service';
import { useFindPerimetersQuery } from '../../services/perimeter.service';
import { age } from '../../utils/dateUtils';
import AppLink from '../_app/AppLink/AppLink';
import DPE from '../DPE/DPE';
import OccupancyBadge from '../Housing/OccupancyBadge';
import Map from '../Map/Map';
import HousingAttribute from './HousingAttribute';
import styles from './housing-details-card.module.scss';

interface HousingTabProps {
  housing: Housing;
}

function HousingTab(props: Readonly<HousingTabProps>) {
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
              props.housing.livingArea ? `${props.housing.livingArea} m²` : null
            }
          />
          <HousingAttribute label="Pièces" value={props.housing.roomsCount} />
          <HousingAttribute
            label="Classement cadastral"
            value={
              props.housing.cadastralClassification
                ? CADASTRAL_CLASSIFICATION_OPTIONS[
                    props.housing.cadastralClassification
                  ].label
                : null
            }
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
              props.housing.energyConsumption ? (
                <DPE value={props.housing.energyConsumption} />
              ) : null
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
                label="Complément d'adresse"
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
                          return props.housing.geoPerimeters?.includes(
                            perimeter.kind
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
                  props.housing.geoPerimeters?.length
                    ? 'Pas d’information'
                    : 'Aucun périmètre'
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
            value={<OccupancyBadge occupancy={props.housing.occupancy} />}
          />
          <HousingAttribute
            label="Année de début de vacance déclarée"
            value={
              props.housing.vacancyStartYear ? (
                <Typography>
                  {props.housing.vacancyStartYear} (
                  {`${years} an${years && years >= 2 ? 's' : ''}`})
                </Typography>
              ) : null
            }
          />
          <HousingAttribute
            label="Occupation prévisionnelle"
            value={
              props.housing.occupancyIntended ? (
                <OccupancyBadge occupancy={props.housing.occupancyIntended} />
              ) : null
            }
          />
          <HousingAttribute label="Dernière mutation" value={lastMutation} />
        </Stack>
      </Grid>
    </Grid>
  );
}

export default HousingTab;
