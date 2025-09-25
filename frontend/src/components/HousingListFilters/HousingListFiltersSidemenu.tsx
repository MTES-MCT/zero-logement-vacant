import { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import Button from '@codegouvfr/react-dsfr/Button';
import MuiDrawer from '@mui/material/Drawer';
import { CSSObject, styled, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import {
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory,
  Occupancy
} from '@zerologementvacant/models';
import { isDefined } from '@zerologementvacant/utils';
import classNames from 'classnames';
import { Set } from 'immutable';
import { usePostHog } from 'posthog-js/react';

import { useIntercommunalities } from '../../hooks/useIntercommunalities';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useAppSelector } from '../../hooks/useStore';
import { useToggle } from '../../hooks/useToggle';
import { useUser } from '../../hooks/useUser';
import { HousingFilters } from '../../models/HousingFilters';
import { getSubStatuses } from '../../models/HousingState';
import { getCity, getDistricts } from '../../models/Locality';
import { getPrecision } from '../../models/Precision';
import { useFindCampaignsQuery } from '../../services/campaign.service';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import { useFindPrecisionsQuery } from '../../services/precision.service';
import { Icon } from '../_dsfr';
import GroupHeader from '../GroupHeader/GroupHeader';
import PerimetersModalOpener from '../modals/GeoPerimetersModal/PerimetersModalOpener';
import PrecisionSelect from '../Precision/PrecisionSelect';
import SearchableSelectNext from '../SearchableSelectNext/SearchableSelectNext';
import BuildingPeriodSelect from './BuildingPeriodSelect';
import CadastralClassificationSelect from './CadastralClassificationSelect';
import CampaignSelect from './CampaignSelect';
import DataFileYearSelect from './DataFileYearSelect';
import EnergyConsumptionSelect from './EnergyConsumptionSelect';
import styles from './housing-list-filters.module.scss';
import HousingCountSelect from './HousingCountSelect';
import HousingKindSelect from './HousingKindSelect';
import HousingStatusSelect from './HousingStatusSelect';
import HousingSubStatusSelect from './HousingSubStatusSelect';
import LastMutationTypeSelect from './LastMutationTypeSelect';
import LastMutationYearSelect from './LastMutationYearSelect';
import LocalityKindSelect from './LocalityKindSelect';
import MultiOwnerSelect from './MultiOwnerSelect';
import OccupancySelect from './OccupancySelect';
import OwnerAgeSelect from './OwnerAgeSelect';
import OwnerKindSelect from './OwnerKindSelect';
import OwnershipKindSelect from './OwnershipKindSelect';
import PerimeterSearchableSelect from './PerimeterSearchableSelect';
import RoomCountSelect from './RoomCountSelect';
import SecondaryOwnerSelect from './SecondaryOwnerSelect';
import SurfaceSelect from './SurfaceSelect';
import VacancyRateSelect from './VacancyRateSelect';
import VacancyYearSelect from './VacancyYearSelect';
import createPerimetersModal from '../modals/GeoPerimetersModal/PerimetersModal';
import Stack from '@mui/material/Stack';
import Tooltip from '~/Tooltip/Tooltip';

interface TitleWithIconProps {
  icon: FrIconClassName | RiIconClassName;
  title: string;
}

function TitleWithIcon(props: TitleWithIconProps) {
  return (
    <>
      <Icon name={props.icon} className={styles.icon} verticalAlign="middle" />
      <span>{props.title}</span>
    </>
  );
}

const perimetersModal = createPerimetersModal();

interface Props {
  filters: HousingFilters;
  expand?: boolean;
  onChange: (filters: HousingFilters, label?: string) => void;
  onReset: () => void;
  onClose: () => void;
}

function HousingListFiltersSidemenu(props: Props) {
  const posthog = usePostHog();

  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );

  const toggle = useToggle(true);

  const filters = props.filters;
  const onChangeFilters = props.onChange;
  const onResetFilters = props.onReset;
  const { data: geoPerimeters } = useListGeoPerimetersQuery();
  const { localities } = useLocalityList(establishment?.id);

  const { data: intercommunalities, isFetching } = useIntercommunalities();
  const localityOptions = localities
    ?.filter((locality) => {
      const districts = getDistricts(locality.geoCode);
      return districts === null;
    })
    ?.filter((locality) => {
      if (!filters.intercommunalities?.length) {
        return true;
      }

      const set = Set(
        intercommunalities
          ?.filter((interco) =>
            filters.intercommunalities?.includes(interco.id)
          )
          ?.flatMap((interco) => interco.geoCodes)
      );
      return set.has(locality.geoCode);
    });

  const { data: precisions } = useFindPrecisionsQuery();
  const precisionOptions = precisions ?? [];

  const { data: campaigns } = useFindCampaignsQuery();
  const campaignOptions = campaigns ?? [];

  const { isVisitor } = useUser();

  return (
    <>
      <perimetersModal.Component />
      <Drawer
        open={toggle.active}
        sx={(theme) => ({
          height: '100%',
          zIndex: theme.zIndex.appBar - 1,
          '& .MuiDrawer-root': {
            position: 'relative',
            zIndex: theme.zIndex.appBar - 1
          },
          '& .MuiPaper-root': {
            padding: '1rem',
            position: 'relative'
          }
        })}
        variant="permanent"
      >
        <Button
          className="fr-mb-2w"
          iconId={
            toggle.active
              ? 'fr-icon-arrow-left-s-first-line'
              : 'fr-icon-arrow-right-s-last-line'
          }
          priority="tertiary"
          size="small"
          style={{
            alignSelf: toggle.active ? 'flex-end' : 'center'
          }}
          title={toggle.active ? 'Fermer' : 'Ouvrir'}
          onClick={() => toggle.toggle()}
        >
          {toggle.active ? 'Réduire' : undefined}
        </Button>
        <GroupHeader
          className={classNames('fr-mb-4w', styles.drawerContent, {
            [styles.drawerContentExpanded]: toggle.active
          })}
        />
        <hr
          className={classNames('fr-pb-4w', styles.drawerContent, {
            [styles.drawerContentExpanded]: toggle.active
          })}
        />
        <Grid
          className={classNames(styles.drawerContent, {
            [styles.drawerContentExpanded]: toggle.active
          })}
          size="grow"
        >
          <Grid
            alignItems="flex-start"
            component="header"
            container
            mb={1}
            justifyContent="space-between"
          >
            <Grid component="section" size="auto">
              <Stack
                direction="row"
                alignItems="baseline"
                spacing="0.75rem"
                useFlexGap
              >
                <Typography component="h2" variant="h6">
                  Filtres
                </Typography>
                <Tooltip
                  kind="hover"
                  mode="manual"
                  align="start"
                  place="top"
                  title={
                    <>
                      <Typography
                        component="p"
                        variant="caption"
                        sx={{ fontWeight: 700 }}
                      >
                        À l’aide des filtres, ciblez les logements qui vous
                        intéressent en particulier !
                      </Typography>
                      <Typography component="p" variant="caption">
                        Il est possible de naviguer entre les différentes
                        sources de données (millésimes précédents ou fichiers
                        différents) à l’aide du filtre portant sur les “Fichiers
                        sources”. Vous pouvez par exemple afficher les logements
                        du parc locatif privé en sélectionnant les Fichiers
                        Fonciers.
                      </Typography>
                    </>
                  }
                />
              </Stack>
            </Grid>
            <Grid component="section" size="auto">
              <Button
                priority="tertiary no outline"
                size="small"
                onClick={onResetFilters}
              >
                Réinitialiser les filtres
              </Button>
            </Grid>
          </Grid>

          <Accordion
            label={
              <TitleWithIcon
                icon="fr-icon-server-line"
                title="Fichiers sources"
              />
            }
          >
            <Grid component="article" mb={2} size={12}>
              <DataFileYearSelect
                multiple
                type="included"
                value={filters.dataFileYearsIncluded ?? []}
                onChange={(values) => {
                  onChangeFilters({
                    dataFileYearsIncluded: values
                  });
                  posthog.capture('filtre-sources-millesimes-inclus');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <DataFileYearSelect
                multiple
                type="excluded"
                value={filters.dataFileYearsExcluded ?? []}
                onChange={(values) => {
                  onChangeFilters({ dataFileYearsExcluded: values });
                  posthog.capture('filtre-sources-millesimes-exclus');
                }}
              />
            </Grid>
          </Accordion>

          <Accordion
            label={
              <TitleWithIcon
                icon="fr-icon-map-pin-user-line"
                title="Vie du logement"
              />
            }
          >
            <Grid component="article" mb={2} size={12}>
              <OccupancySelect
                label="Occupation actuelle"
                multiple
                value={filters.occupancies ?? []}
                onChange={(values) => {
                  onChangeFilters({ occupancies: values });
                  posthog.capture('filtre-statut-occupation');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <VacancyYearSelect
                disabled={!filters.occupancies?.includes(Occupancy.VACANT)}
                multiple
                value={filters.vacancyYears ?? []}
                onChange={(values) => {
                  onChangeFilters({ vacancyYears: values });
                  posthog.capture('filtre-annee-debut-vacance');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={{ xs: 12 }}>
              <LastMutationTypeSelect
                multiple
                value={filters.lastMutationTypes ?? []}
                onChange={(values) => {
                  onChangeFilters({ lastMutationTypes: values });
                  posthog.capture('filtre-type-derniere-mutation');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={{ xs: 12 }}>
              <LastMutationYearSelect
                multiple
                value={filters.lastMutationYears ?? []}
                onChange={(values) => {
                  onChangeFilters({ lastMutationYears: values });
                  posthog.capture('filtre-annee-derniere-mutation');
                }}
              />
            </Grid>
          </Accordion>

          <Accordion
            label={
              <TitleWithIcon
                icon="fr-icon-folder-2-line"
                title="Mobilisation"
              />
            }
          >
            <Grid component="article" mb={2} size={12}>
              <HousingStatusSelect
                multiple
                options={HOUSING_STATUS_VALUES}
                value={filters.statusList ?? []}
                onChange={(values) => {
                  onChangeFilters({ statusList: values });
                  posthog.capture('filtre-statut-suivi');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <HousingSubStatusSelect
                grouped={true}
                multiple
                options={filters.statusList?.flatMap(getSubStatuses) ?? []}
                value={filters.subStatus ?? []}
                onChange={(values) => {
                  onChangeFilters({ subStatus: values });
                  posthog.capture('filtre-sous-statut-suivi');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <CampaignSelect
                disabled={campaigns && campaigns.length === 0}
                multiple
                options={campaigns ?? []}
                value={
                  filters.campaignIds?.map((id) => {
                    const option = campaignOptions.find(
                      (option) => option.id === id
                    );
                    return option ?? null;
                  }) ?? []
                }
                onChange={(values) => {
                  onChangeFilters({
                    campaignIds: values.map((value) =>
                      value !== null ? value.id : null
                    )
                  });
                  posthog.capture('filtre-campagne');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <PrecisionSelect
                label="Dispositifs"
                options={precisionOptions.filter((precision) =>
                  isPrecisionMechanismCategory(precision.category)
                )}
                values={
                  filters.precisions
                    ? filters.precisions
                        .map(getPrecision(precisionOptions))
                        .filter((precision) =>
                          isPrecisionMechanismCategory(precision.category)
                        )
                    : []
                }
                onChange={(values) => {
                  const otherPrecisions = filters.precisions
                    ?.map(getPrecision(precisionOptions))
                    ?.filter(
                      (precision) =>
                        !isPrecisionMechanismCategory(precision.category)
                    );
                  onChangeFilters({
                    precisions: values
                      .concat(otherPrecisions ?? [])
                      .map((precision) => precision.id)
                  });
                  posthog.capture('filtre-dispositifs');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <PrecisionSelect
                label="Points de blocage"
                options={precisionOptions.filter((precision) =>
                  isPrecisionBlockingPointCategory(precision.category)
                )}
                values={
                  filters.precisions
                    ? filters.precisions
                        .map(getPrecision(precisionOptions))
                        .filter((precision) =>
                          isPrecisionBlockingPointCategory(precision.category)
                        )
                    : []
                }
                onChange={(values) => {
                  const otherPrecisions = filters.precisions
                    ?.map(getPrecision(precisionOptions))
                    ?.filter(
                      (precision) =>
                        !isPrecisionBlockingPointCategory(precision.category)
                    );
                  onChangeFilters({
                    precisions: values
                      .concat(otherPrecisions ?? [])
                      .map((precision) => precision.id)
                  });
                  posthog.capture('filtre-points-de-blocage');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <PrecisionSelect
                label="Évolutions du logement"
                options={precisionOptions.filter((precision) =>
                  isPrecisionEvolutionCategory(precision.category)
                )}
                values={
                  filters.precisions
                    ? filters.precisions
                        .map(getPrecision(precisionOptions))
                        .filter((precision) =>
                          isPrecisionEvolutionCategory(precision.category)
                        )
                    : []
                }
                onChange={(values) => {
                  const otherPrecisions = filters.precisions
                    ?.map(getPrecision(precisionOptions))
                    ?.filter(
                      (precision) =>
                        !isPrecisionEvolutionCategory(precision.category)
                    );
                  onChangeFilters({
                    precisions: values
                      .concat(otherPrecisions ?? [])
                      .map((precision) => precision.id)
                  });
                  posthog.capture('filtre-evolutions');
                }}
              />
            </Grid>
          </Accordion>
          <Accordion
            label={
              <TitleWithIcon icon="fr-icon-france-line" title="Localisation" />
            }
          >
            <Grid component="article" mb={2} size={12}>
              <SearchableSelectNext
                label="Intercommunalités"
                placeholder="Rechercher une intercommunalité"
                disabled={!intercommunalities || !intercommunalities.length}
                options={intercommunalities ?? []}
                loading={isFetching}
                multiple
                getOptionKey={(option) => option.id}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={
                  filters.intercommunalities
                    ?.map((intercommunality) => {
                      return intercommunalities?.find(
                        (establishment) => establishment.id === intercommunality
                      );
                    })
                    ?.filter(isDefined) ?? []
                }
                onChange={(values) => {
                  onChangeFilters({
                    intercommunalities: values.map((value) => value.id)
                  });
                  posthog.capture('filtre-intercommunalite');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <SearchableSelectNext
                multiple
                disabled={localityOptions && localityOptions.length === 0}
                label="Commune"
                placeholder="Rechercher une commune"
                options={
                  localityOptions?.toSorted((a, b) => {
                    const cityA = getCity(a.geoCode) ?? '';
                    const cityB = getCity(b.geoCode) ?? '';
                    return cityA.localeCompare(cityB);
                  }) ?? []
                }
                isOptionEqualToValue={(option, value) =>
                  option.geoCode === value.geoCode
                }
                getOptionLabel={(option) => option.name}
                groupBy={(option) => {
                  const city = getCity(option.geoCode);
                  return city ?? '';
                }}
                renderGroup={(group) => {
                  const city = localities?.find(
                    (locality) => locality.geoCode === group
                  );
                  return (
                    <Typography
                      sx={{ mt: '0.125rem', fontWeight: 700 }}
                      variant="body2"
                    >
                      {city?.name ?? group}
                    </Typography>
                  );
                }}
                value={
                  filters.localities?.map((geoCode) => {
                    const option = localityOptions?.find(
                      (option) => option.geoCode === geoCode
                    );
                    if (!option) {
                      throw new Error(`Locality ${geoCode} not found`);
                    }

                    return option;
                  }) ?? []
                }
                onChange={(values) => {
                  onChangeFilters({
                    localities: values.map((value) => value.geoCode)
                  });
                  posthog.capture('filtre-commune');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <LocalityKindSelect
                multiple
                value={filters.localityKinds ?? []}
                onChange={(values) => {
                  onChangeFilters({ localityKinds: values });
                  posthog.capture('filtre-type-commune');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <PerimeterSearchableSelect
                label="Périmètre inclus"
                multiple
                options={geoPerimeters ?? []}
                value={filters.geoPerimetersIncluded ?? []}
                onChange={(values) => {
                  onChangeFilters({
                    geoPerimetersIncluded: values
                  });
                  posthog.capture('filtre-perimetre-inclus');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <PerimeterSearchableSelect
                label="Périmètre exclus"
                multiple
                options={geoPerimeters ?? []}
                value={filters.geoPerimetersExcluded ?? []}
                onChange={(values) => {
                  onChangeFilters({
                    geoPerimetersExcluded: values
                  });
                  posthog.capture('filtre-perimetre-exclus');
                }}
              />
            </Grid>
            <Grid component="section" size={12}>
              {!isVisitor && <PerimetersModalOpener modal={perimetersModal} />}
            </Grid>
          </Accordion>

          <Accordion
            label={
              <TitleWithIcon
                icon="fr-icon-building-line"
                title="Bâtiment/DPE"
              />
            }
          >
            <Grid component="article" mb={2} size={12}>
              <BuildingPeriodSelect
                multiple
                value={filters.buildingPeriods ?? []}
                onChange={(values) => {
                  onChangeFilters({ buildingPeriods: values });
                  posthog.capture('filtre-date-construction');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <EnergyConsumptionSelect
                multiple
                value={filters.energyConsumption ?? []}
                onChange={(values) => {
                  onChangeFilters({ energyConsumption: values });
                  posthog.capture('filtre-etiquette-dpe');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <OwnershipKindSelect
                multiple
                value={filters.ownershipKinds ?? []}
                onChange={(values) => {
                  onChangeFilters({ ownershipKinds: values });
                  posthog.capture('filtre-type-propriete');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <HousingCountSelect
                multiple
                value={filters.housingCounts ?? []}
                onChange={(values) => {
                  onChangeFilters({ housingCounts: values });
                  posthog.capture('filtre-nombre-de-logements');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <VacancyRateSelect
                multiple
                value={filters.vacancyRates ?? []}
                onChange={(values) => {
                  onChangeFilters({ vacancyRates: values });
                  posthog.capture('filtre-taux-de-vacance');
                }}
              />
            </Grid>
          </Accordion>
          <Accordion
            label={
              <TitleWithIcon icon="fr-icon-home-4-line" title="Logement" />
            }
          >
            <Grid component="article" mb={2} size={12}>
              <HousingKindSelect
                multiple
                options={HOUSING_KIND_VALUES}
                value={filters.housingKinds ?? []}
                onChange={(values) => {
                  onChangeFilters({ housingKinds: values });
                  posthog.capture('filtre-type-logement');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <SurfaceSelect
                multiple
                value={filters.housingAreas ?? []}
                onChange={(values) => {
                  onChangeFilters({ housingAreas: values });
                  posthog.capture('filtre-surface');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <RoomCountSelect
                multiple
                value={filters.roomsCounts ?? []}
                onChange={(values) => {
                  onChangeFilters({ roomsCounts: values });
                  posthog.capture('filtre-nombre-de-pieces');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <CadastralClassificationSelect
                multiple
                value={filters.cadastralClassifications ?? []}
                onChange={(values) => {
                  onChangeFilters({
                    cadastralClassifications: values
                  });
                  posthog.capture('filtre-classement-cadastral');
                }}
              />
            </Grid>
          </Accordion>
          <Accordion
            label={
              <TitleWithIcon icon="fr-icon-user-line" title="Propriétaires" />
            }
          >
            <Grid component="article" mb={2} size={12}>
              <OwnerKindSelect
                multiple
                value={filters.ownerKinds ?? []}
                onChange={(values) => {
                  onChangeFilters({ ownerKinds: values });
                  posthog.capture('filtre-type-proprietaire');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <OwnerAgeSelect
                multiple
                value={filters.ownerAges ?? []}
                onChange={(values) => {
                  onChangeFilters({ ownerAges: values });
                  posthog.capture('filtre-age');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <MultiOwnerSelect
                multiple
                value={filters.multiOwners ?? []}
                onChange={(values) => {
                  onChangeFilters({ multiOwners: values });
                  posthog.capture('filtre-multi-proprietaire');
                }}
              />
            </Grid>
            <Grid component="article" mb={2} size={12}>
              <SecondaryOwnerSelect
                multiple
                value={filters.beneficiaryCounts ?? []}
                onChange={(values) => {
                  onChangeFilters({ beneficiaryCounts: values });
                  posthog.capture('filtre-proprietaires-secondaires');
                }}
              />
            </Grid>
          </Accordion>
        </Grid>
      </Drawer>
    </>
  );
}

const drawerWidth = 330;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen
  }),
  overflowX: 'hidden'
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`
  }
});

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== 'open'
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme)
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme)
  })
}));

export default HousingListFiltersSidemenu;
