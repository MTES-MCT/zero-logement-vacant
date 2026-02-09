import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { fromHousing } from '@zerologementvacant/models';
import classNames from 'classnames';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { type ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';

import DPE from '~/components/DPE/DPE';
import OccupancyBadge from '~/components/Housing/OccupancyBadge';
import HousingAttribute from '~/components/HousingDetails/HousingAttribute';
import styles from '~/components/HousingDetails/housing-details-card.module.scss';
import Map from '~/components/Map/Map';
import { useHousing } from '~/hooks/useHousing';
import { formatOwnershipKind, getBuildingLocation } from '~/models/Housing';
import { CADASTRAL_CLASSIFICATION_OPTIONS } from '~/models/HousingFilters';
import { toString as toMutationString } from '~/models/Mutation';
import { useGetBuildingQuery } from '~/services/building.service';
import { useFindPerimetersQuery } from '~/services/perimeter.service';
import { age, birthdate } from '~/utils/dateUtils';
import AppLink from '../_app/AppLink/AppLink';

function HousingTab() {
  const { housing } = useHousing();
  const isActualDpeEnabled = useFeatureFlagEnabled('actual-dpe');
  const isHouse = housing?.housingKind === 'MAISON';
  const getBuildingQuery = useGetBuildingQuery(
    housing?.buildingId ?? skipToken
  );
  const findPerimetersQuery = useFindPerimetersQuery(undefined, {
    skip: !housing?.geoPerimeters?.length
  });

  const buildingLocation = housing ? getBuildingLocation(housing) : null;
  const addressComplement: string | null = buildingLocation
    ? [
        buildingLocation.building,
        buildingLocation.entrance,
        buildingLocation.level,
        buildingLocation.local
      ].join(', ')
    : null;

  const years = housing?.vacancyStartYear
    ? age(housing.vacancyStartYear.toString())
    : null;

  const mutation = housing ? fromHousing(housing) : null;
  const lastMutation = mutation ? toMutationString(mutation) : null;

  if (!housing) {
    return null;
  }

  return (
    <Grid component="section" container columnSpacing="1rem">
      <Grid
        component="section"
        rowGap="2rem"
        sx={{ display: 'flex', flexFlow: 'column nowrap' }}
        size={5}
      >
        <Stack component="article" spacing="0.75rem" useFlexGap>
          <Typography
            component="h3"
            variant="body1"
            sx={{ fontSize: '1.125rem', fontWeight: 700 }}
          >
            Informations sur le logement
          </Typography>

          <HousingAttribute label="Type" value={housing.housingKind} />
          <HousingAttribute
            label="Surface"
            value={housing.livingArea ? `${housing.livingArea} m²` : null}
          />
          <HousingAttribute label="Pièces" value={housing.roomsCount} />
          <HousingAttribute
            label="Classement cadastral"
            value={
              housing.cadastralClassification
                ? CADASTRAL_CLASSIFICATION_OPTIONS[
                    housing.cadastralClassification
                  ].label
                : null
            }
          />
          {isActualDpeEnabled && (
            <HousingAttribute
              label={
                <Stack>
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ fontWeight: 700 }}
                  >
                    Étiquette DPE renseignée
                  </Typography>
                  <Typography component="span" variant="caption">
                    Renseignée par un utilisateur ZLV
                  </Typography>
                </Stack>
              }
              value={
                housing.actualEnergyConsumption ? (
                  <DPE value={housing.actualEnergyConsumption} />
                ) : null
              }
            />
          )}
          <HousingAttribute
            label="Identifiant fiscal départemental"
            value={housing.invariant}
          />
        </Stack>

        <Stack component="article" spacing="0.75rem" useFlexGap>
          <Typography
            component="h3"
            variant="body1"
            sx={{ fontSize: '1.125rem', fontWeight: 700 }}
          >
            Informations sur le bâtiment
          </Typography>

          <HousingAttribute
            label="Date de construction"
            value={housing.buildingYear}
          />
          <HousingAttribute
            label="Type de propriété"
            value={formatOwnershipKind(housing.ownershipKind)}
          />
          {isActualDpeEnabled &&
            match(getBuildingQuery)
              .returnType<ReactNode>()
              .with({ isLoading: true }, () => (
                <HousingAttribute
                  label="Étiquette DPE représentatif (ADEME)"
                  value={<Skeleton animation="wave" variant="text" />}
                />
              ))
              .with(
                {
                  isSuccess: true,
                  data: Pattern.nonNullable
                },
                ({ data: building }) => (
                  <HousingAttribute
                    label={
                      <Stack>
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          Étiquette DPE représentatif (
                          {building.dpe ? (
                            <AppLink
                              to={`https://observatoire-dpe-audit.ademe.fr/afficher-dpe/${building.dpe?.id}`}
                            >
                              ADEME
                            </AppLink>
                          ) : (
                            'ADEME'
                          )}
                          )
                        </Typography>
                        <Typography component="span" variant="caption">
                          Issue du DPE le plus récent du bâtiment
                        </Typography>
                      </Stack>
                    }
                    value={
                      building.dpe ? (
                        <Stack direction="row" spacing="0.5rem" useFlexGap>
                          <DPE value={building.dpe.class} />
                          <Typography component="span">
                            réalisé le {birthdate(building.dpe.doneAt)}
                          </Typography>
                        </Stack>
                      ) : null
                    }
                  />
                )
              )
              .otherwise(() => null)}
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
          {isActualDpeEnabled && (
            <HousingAttribute
              label="Identifiant Référentiel National des Bâtiments"
              value={match(getBuildingQuery)
                .returnType<ReactNode>()
                .with({ isLoading: true }, () => (
                  <Skeleton animation="wave" variant="text" />
                ))
                .with(
                  {
                    isSuccess: true,
                    data: {
                      rnb: {
                        id: Pattern.string
                      }
                    }
                  },
                  ({ data: building }) => building.rnb.id
                )
                .otherwise(() => null)}
            />
          )}
        </Stack>
      </Grid>
      <Grid
        component="section"
        rowGap="2rem"
        sx={{ display: 'flex', flexFlow: 'column nowrap' }}
        size={7}
      >
        <Stack component="article" spacing="0.75rem" useFlexGap>
          <Typography
            component="h3"
            variant="body1"
            sx={{ fontSize: '1.125rem', fontWeight: 700 }}
          >
            Localisation
          </Typography>

          <Grid container columnSpacing="0.5rem">
            <Grid size={6}>
              <Stack spacing="0.5rem">
                <HousingAttribute
                  label="Référence cadastrale"
                  value={housing.cadastralReference}
                />
                {isActualDpeEnabled && (
                  <HousingAttribute
                    label="Surface de la parcelle"
                    value={housing.plotArea ? `${housing.plotArea} m²` : null}
                  />
                )}
              </Stack>
            </Grid>
            <Grid sx={{ textAlign: 'end' }} size={6}>
              <HousingAttribute
                label="Complément d'adresse"
                value={addressComplement}
              />
            </Grid>
          </Grid>

          {!housing.latitude || !housing.longitude ? null : (
            <>
              <Map
                housingList={[housing]}
                showMapSettings={false}
                style={{ minHeight: '21rem' }}
              />
              <Stack component="section" sx={{ alignItems: 'flex-end' }}>
                <AppLink
                  title="Voir le bâtiment - nouvelle fenêtre"
                  to={`https://www.google.com/maps/place/${housing.latitude},${housing.longitude}`}
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
                      const names = perimeters
                        .filter((perimeter) => {
                          return housing.geoPerimeters?.includes(
                            perimeter.kind
                          );
                        })
                        .map((perimeter) => perimeter.name)
                        .join(' ; ');
                      return names.length > 0 ? (
                        <Typography>{names}</Typography>
                      ) : null;
                    }
                  )
                  .otherwise(() => null)}
                fallback={
                  housing.geoPerimeters?.length
                    ? 'Pas d’information'
                    : 'Aucun périmètre'
                }
              />
            </>
          )}
        </Stack>

        <Stack component="article" spacing="0.75rem" useFlexGap>
          <Typography
            component="h3"
            variant="body1"
            sx={{ fontSize: '1.125rem', fontWeight: 700 }}
          >
            Vie du logement
          </Typography>

          <HousingAttribute
            label="Occupation actuelle"
            value={<OccupancyBadge occupancy={housing.occupancy} />}
          />
          <HousingAttribute
            label="Année de début de vacance déclarée"
            value={
              housing.vacancyStartYear ? (
                <Typography>
                  {housing.vacancyStartYear} (
                  {`${years} an${years && years >= 2 ? 's' : ''}`})
                </Typography>
              ) : null
            }
          />
          <HousingAttribute
            label="Occupation prévisionnelle"
            value={
              housing.occupancyIntended ? (
                <OccupancyBadge occupancy={housing.occupancyIntended} />
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
