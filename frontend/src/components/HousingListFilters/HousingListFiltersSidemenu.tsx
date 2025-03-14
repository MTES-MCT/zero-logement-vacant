import { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import Button from '@codegouvfr/react-dsfr/Button';
import MuiDrawer from '@mui/material/Drawer';
import { CSSObject, styled, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import {
  HousingStatus,
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory,
  Occupancy
} from '@zerologementvacant/models';

import { isDefined } from '@zerologementvacant/utils';
import classNames from 'classnames';
import posthog from 'posthog-js';
import { useIntercommunalities } from '../../hooks/useIntercommunalities';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useAppSelector } from '../../hooks/useStore';
import { useToggle } from '../../hooks/useToggle';
import { useUser } from '../../hooks/useUser';
import { geoPerimeterOptions } from '../../models/GeoPerimeter';
import {
  allOccupancyOptions,
  beneficiaryCountOptions,
  buildingPeriodOptions,
  cadastralClassificationOptions,
  dataFileYearsExcludedOptions,
  dataFileYearsIncludedOptions,
  energyConsumptionOptions,
  housingAreaOptions,
  housingCountOptions,
  HousingFilters,
  housingKindOptions,
  localityKindsOptions,
  multiOwnerOptions,
  ownerAgeOptions,
  ownerKindOptions,
  ownershipKindsOptions,
  roomsCountOptions,
  statusOptions,
  taxedOptions,
  unselectedOptions,
  vacancyRateOptions,
  vacancyYearOptions
} from '../../models/HousingFilters';
import {
  getSubStatusList,
  getSubStatusListOptions
} from '../../models/HousingState';
import { getPrecision } from '../../models/Precision';
import { useFindCampaignsQuery } from '../../services/campaign.service';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import { useFindPrecisionsQuery } from '../../services/precision.service';
import { concat } from '../../utils/arrayUtils';
import AppMultiSelect from '../_app/AppMultiSelect/AppMultiSelect';
import { Icon, SearchableSelect, Text } from '../_dsfr';
import GroupHeader from '../GroupHeader/GroupHeader';
import GeoPerimetersModalLink from '../modals/GeoPerimetersModal/GeoPerimetersModalLink';
import PrecisionSelect from '../Precision/PrecisionSelect';
import SearchableSelectNext from '../SearchableSelectNext/SearchableSelectNext';
import { citiesWithDistricts } from '../../models/Locality';
import CampaignFilter from './CampaignFilter';
import styles from './housing-list-filters.module.scss';
import HousingStatusMultiSelect from './HousingStatusMultiSelect';

interface TitleWithIconProps {
  icon: FrIconClassName | RiIconClassName;
  title: string;
}

function TitleWithIcon(props: TitleWithIconProps) {
  return (
    <>
      <Icon name={props.icon} className={styles.icon} verticalAlign="middle" />
      <Text as="span">{props.title}</Text>
    </>
  );
}

interface Props {
  filters: HousingFilters;
  expand?: boolean;
  onChange: (filters: HousingFilters, label?: string) => void;
  onReset: () => void;
  onClose: () => void;
}

function HousingListFiltersSidemenu(props: Props) {
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );

  const toggle = useToggle(true);

  const filters = props.filters;
  const onChangeFilters = props.onChange;
  const onResetFilters = props.onReset;
  const { data: campaigns } = useFindCampaignsQuery();
  const { data: geoPerimeters } = useListGeoPerimetersQuery();
  const { localities } = useLocalityList(establishment?.id);

  function onChangeStatusFilter(status: HousingStatus, isChecked: boolean) {
    const statusList = [
      ...(filters.statusList ?? []).filter((_) => _ !== status),
      ...(isChecked ? [status] : [])
    ];
    onChangeFilters(
      {
        statusList,
        subStatus: filters.subStatus?.filter((_) =>
          getSubStatusList(statusList).includes(_)
        )
      },
      'Statut'
    );
  }

  const { data: intercommunalities, isFetching } = useIntercommunalities();
  const localityOptions =
    localities
      ?.filter((locality) => {
        if (!filters.intercommunalities?.length) {
          return true;
        }

        const set = new Set(
          intercommunalities
            ?.filter((interco) =>
              filters.intercommunalities?.includes(interco.id)
            )
            ?.flatMap((interco) => interco.geoCodes)
        );
        return set.has(locality.geoCode);
      })
      ?.map((locality) => ({
        value: locality.geoCode,
        label: locality.name
      })) ?? [];

  const { data: precisions } = useFindPrecisionsQuery();
  const precisionOptions = precisions ?? [];

  const { isVisitor } = useUser();

  return (
    <Drawer
      open={toggle.active}
      sx={(theme) => ({
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
        xs
      >
        <Grid
          alignItems="flex-start"
          component="header"
          container
          mb={1}
          justifyContent="space-between"
        >
          <Grid component="section" xs="auto">
            <Typography component="h2" variant="h6" mb={3}>
              Filtres
            </Typography>
          </Grid>
          <Grid component="section" xs="auto">
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
          label={<TitleWithIcon icon="fr-icon-server-line" title="Fichiers sources" />}
        >
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Sources et millésimes inclus"
              options={dataFileYearsIncludedOptions}
              initialValues={(filters.dataFileYearsIncluded ?? []).map((_) =>
                String(_)
              )}
              onChange={(values) => {
                onChangeFilters(
                  { dataFileYearsIncluded: values },
                  'Sources et Millésimes inclus'
                );
                posthog.capture('filtre-sources-millesimes-inclus');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Sources et millésimes exclus"
              defaultOption="Aucun"
              options={dataFileYearsExcludedOptions}
              initialValues={(filters.dataFileYearsExcluded ?? []).map((_) =>
                String(_)
              )}
              onChange={(values) => {
                onChangeFilters(
                  { dataFileYearsExcluded: values },
                  'Sources et millésime exclus'
                );
                posthog.capture('filtre-sources-millesimes-exclus');
              }}
            />
          </Grid>
        </Accordion>
        
        <Accordion
          label={
            <TitleWithIcon
              icon="fr-icon-map-pin-user-line"
              title="Occupation"
            />
          }
        >
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Statut d’occupation"
              options={allOccupancyOptions}
              initialValues={filters.occupancies}
              onChange={(values) => {
                onChangeFilters({ occupancies: values }, 'Statut d’occupation');
                posthog.capture('filtre-statut-occupation');
              }}
            />
          </Grid>
          {filters?.occupancies?.includes(Occupancy.VACANT) && (
            <Grid component="article" mb={2} xs={12}>
              <AppMultiSelect
                label="Année de début de vacance"
                options={vacancyYearOptions}
                initialValues={filters.vacancyYears}
                onChange={(values) =>
                  onChangeFilters(
                    { vacancyYears: values },
                    'Année de début de vacance'
                  )
                }
              />
            </Grid>
          )}
        </Accordion>

        <Accordion
          label={
            <TitleWithIcon icon="fr-icon-folder-2-line" title="Mobilisation" />
          }
        >
          <Grid component="article" mb={2} xs={12}>
            <HousingStatusMultiSelect
              selectedStatus={filters.statusList}
              options={statusOptions()}
              onChange={onChangeStatusFilter}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Sous-statut de suivi"
              options={getSubStatusListOptions(filters.statusList ?? [])}
              initialValues={filters.subStatus}
              onChange={(values) => {
                onChangeFilters({ subStatus: values }, 'Sous-statut');
                posthog.capture('filtre-sous-statut-suivi');
              }}
            />
          </Grid>
          {campaigns && (
            <Grid component="article" mb={2} xs={12}>
              <CampaignFilter
                options={campaigns}
                values={filters.campaignIds ?? []}
                onChange={(values: Array<string | null>) => {
                  onChangeFilters({ campaignIds: values }, 'Campagne');
                  posthog.capture('filtre-campagne');
                }}
              />
            </Grid>
          )}
          <Grid component="article" mb={2} xs={12}>
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
          <Grid component="article" mb={2} xs={12}>
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
          <Grid component="article" mb={2} xs={12}>
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
          <Grid component="article" mb={2} xs={12}>
            <SearchableSelectNext
              autocompleteProps={{
                autoHighlight: true,
                options: intercommunalities ?? [],
                loading: isFetching,
                multiple: true,
                openOnFocus: true,
                size: 'small',
                getOptionKey: (option) => option.id,
                getOptionLabel: (option) => option.name,
                isOptionEqualToValue: (option, value) => option.id === value.id,
                value:
                  filters.intercommunalities
                    ?.map((intercommunality) => {
                      return intercommunalities?.find(
                        (establishment) => establishment.id === intercommunality
                      );
                    })
                    ?.filter(isDefined) ?? [],
                onChange: (_, values) => {
                  if (values) {
                    onChangeFilters(
                      { intercommunalities: values.map((value) => value.id) },
                      'Intercommunalité'
                    );
                    posthog.capture('filtre-intercommunalite');
                  }
                }
              }}
              inputProps={{
                label: 'Intercommunalités',
                nativeInputProps: {
                  placeholder: 'Rechercher une intercommunalité'
                }
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <SearchableSelect
              options={unselectedOptions(localityOptions, filters.localities)}
              label="Commune"
              placeholder="Rechercher une commune"
              onChange={(value: string) => {
                if (value) {
                  let cities = concat(filters.localities, value);
                  cities = (cities ?? [] as Array<keyof typeof citiesWithDistricts>).flatMap(code => citiesWithDistricts[code as keyof typeof citiesWithDistricts] ?? [code]);
                  onChangeFilters(
                    { localities: cities },
                    'Commune'
                  );
                  posthog.capture('filtre-commune');
                }
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Type de commune"
              options={localityKindsOptions}
              initialValues={filters.localityKinds}
              onChange={(values) => {
                onChangeFilters({ localityKinds: values }, 'Type de commune');
                posthog.capture('filtre-commune');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <SearchableSelect
              options={unselectedOptions(
                geoPerimeterOptions(geoPerimeters),
                filters.geoPerimetersIncluded
              )}
              label="Périmètre inclus"
              placeholder="Rechercher un périmètre"
              onChange={(value: string) => {
                if (value) {
                  onChangeFilters(
                    {
                      geoPerimetersIncluded: concat(
                        filters.geoPerimetersIncluded,
                        value
                      )
                    },
                    'Périmètre inclus'
                  );
                  posthog.capture('filtre-perimetre-inclus');
                }
              }}
            />
          </Grid>
          <Grid component="article" mb={0} xs={12}>
            <SearchableSelect
              options={unselectedOptions(
                geoPerimeterOptions(geoPerimeters),
                filters.geoPerimetersExcluded
              )}
              label="Périmètre exclu"
              placeholder="Rechercher un périmètre"
              onChange={(value: string) => {
                if (value) {
                  onChangeFilters(
                    {
                      geoPerimetersExcluded: concat(
                        filters.geoPerimetersExcluded,
                        value
                      )
                    },
                    'Périmètre exclu'
                  );
                  posthog.capture('filtre-perimetre-exclu');
                }
              }}
            />

            {!isVisitor && <GeoPerimetersModalLink />}
          </Grid>
        </Accordion>

        <Accordion
          label={
            <TitleWithIcon icon="fr-icon-building-line" title="Bâtiment/DPE" />
          }
        >
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Nombre de logements"
              options={housingCountOptions}
              initialValues={filters.housingCounts}
              onChange={(values) => {
                onChangeFilters(
                  { housingCounts: values },
                  'Nombre de logements'
                );
                posthog.capture('filtre-nombre-de-logements');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Taux de vacance"
              options={vacancyRateOptions}
              initialValues={filters.vacancyRates}
              onChange={(values) => {
                onChangeFilters({ vacancyRates: values }, 'Taux de vacance');
                posthog.capture('filtre-taux-de-vacance');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Étiquette DPE représentatif (CSTB)"
              options={energyConsumptionOptions}
              initialValues={filters.energyConsumption}
              onChange={(values) => {
                onChangeFilters(
                  { energyConsumption: values },
                  'Étiquette DPE représentatif (CSTB)'
                );
                posthog.capture('filtre-etiquette-dpe');
              }}
            />
          </Grid>
        </Accordion>
        <Accordion
          label={<TitleWithIcon icon="fr-icon-home-4-line" title="Logement" />}
        >
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Type de logement"
              options={housingKindOptions}
              initialValues={filters.housingKinds}
              onChange={(values) => {
                onChangeFilters({ housingKinds: values }, 'Type');
                posthog.capture('filtre-type-logement');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Date de construction"
              options={buildingPeriodOptions}
              initialValues={filters.buildingPeriods}
              onChange={(values) => {
                onChangeFilters(
                  { buildingPeriods: values },
                  'Date de construction'
                );
                posthog.capture('filtre-date-construction');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Surface"
              options={housingAreaOptions}
              initialValues={filters.housingAreas}
              onChange={(values) => {
                onChangeFilters({ housingAreas: values }, 'Surface');
                posthog.capture('filtre-surface');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Nombre de pièces"
              options={roomsCountOptions}
              initialValues={filters.roomsCounts ?? []}
              onChange={(values) => {
                onChangeFilters({ roomsCounts: values }, 'Nombre de pièces');
                posthog.capture('filtre-nombre-de-pieces');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Taxé"
              options={taxedOptions}
              initialValues={filters.isTaxedValues?.map((value) =>
                value ? 'true' : 'false'
              )}
              onChange={(values) => {
                onChangeFilters(
                  {
                    isTaxedValues: values.map((value) => value === 'true')
                  },
                  'Taxé'
                );
                posthog.capture('filtre-taxe');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Classement cadastral"
              options={cadastralClassificationOptions}
              initialValues={filters.cadastralClassifications?.map(String)}
              onChange={(values) => {
                onChangeFilters(
                  { cadastralClassifications: values.map(Number) },
                  'Classement cadastral'
                );
                posthog.capture('filtre-classement-cadastral');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Type de propriété"
              options={ownershipKindsOptions}
              initialValues={filters.ownershipKinds}
              onChange={(values) => {
                onChangeFilters(
                  { ownershipKinds: values },
                  'Type de propriété'
                );
                posthog.capture('filtre-type-propriete');
              }}
            />
          </Grid>
        </Accordion>
        <Accordion
          label={
            <TitleWithIcon icon="fr-icon-user-line" title="Propriétaires" />
          }
        >
          <Grid component="article" mb={2} xs={12}>
            <div data-testid="ownerkind-filter">
              <AppMultiSelect
                label="Type de propriétaire"
                options={ownerKindOptions}
                initialValues={filters.ownerKinds}
                onChange={(values) => {
                  onChangeFilters({ ownerKinds: values }, 'Type');
                  posthog.capture('filtre-type-proprietaire');
                }}
              />
            </div>
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Âge"
              options={ownerAgeOptions}
              initialValues={filters.ownerAges}
              onChange={(values) => {
                onChangeFilters({ ownerAges: values }, 'Âge');
                posthog.capture('filtre-age');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Multi-propriétaire"
              options={multiOwnerOptions}
              initialValues={filters.multiOwners?.map((value) =>
                value ? 'true' : 'false'
              )}
              onChange={(values) => {
                onChangeFilters(
                  { multiOwners: values?.map((value) => value === 'true') },
                  'Multi-propriétaire'
                );
                posthog.capture('filtre-multi-proprietaire');
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Propriétaires secondaires"
              options={beneficiaryCountOptions}
              initialValues={filters.beneficiaryCounts}
              onChange={(values) => {
                onChangeFilters(
                  { beneficiaryCounts: values },
                  'Propriétaires secondaires'
                );
                posthog.capture('filtre-proprietaires-secondaires');
              }}
            />
          </Grid>
        </Accordion>
      </Grid>
    </Drawer>
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
