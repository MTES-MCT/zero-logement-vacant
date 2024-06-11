import { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import Button from '@codegouvfr/react-dsfr/Button';
import MuiDrawer from '@mui/material/Drawer';
import { CSSObject, styled, Theme } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';

import { Icon, SearchableSelect, Text } from '../_dsfr';
import AppMultiSelect from '../_app/AppMultiSelect/AppMultiSelect';
import {
  allOccupancyOptions,
  beneficiaryCountOptions,
  buildingPeriodOptions,
  cadastralClassificationOptions,
  campaignsCountOptions,
  dataYearsExcludedOptions,
  dataYearsIncludedOptions,
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
  vacancyDurationOptions,
  vacancyRateOptions,
} from '../../models/HousingFilters';
import styles from './housing-list-filters.module.scss';
import { OwnershipKinds } from '../../models/Housing';
import {
  getSubStatusList,
  getSubStatusListOptions,
  HousingStatus,
} from '../../models/HousingState';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useAppSelector } from '../../hooks/useStore';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import { concat } from '../../utils/arrayUtils';
import GeoPerimetersModalLink from '../modals/GeoPerimetersModal/GeoPerimetersModalLink';
import HousingStatusMultiSelect from './HousingStatusMultiSelect';
import { geoPerimeterOptions } from '../../models/GeoPerimeter';
import { useToggle } from '../../hooks/useToggle';
import { useFindCampaignsQuery } from '../../services/campaign.service';
import GroupHeader from '../GroupHeader/GroupHeader';
import { useUser } from '../../hooks/useUser';

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
    (state) => state.authentication.authUser?.establishment,
  );

  const toggle = useToggle(true);

  const filters = props.filters;
  const onChangeFilters = props.onChange;
  const onResetFilters = props.onReset;
  const { data: campaigns } = useFindCampaignsQuery();
  const { data: geoPerimeters } = useListGeoPerimetersQuery();
  const { localitiesOptions } = useLocalityList(establishment?.id);

  const onChangeStatusFilter = (status: HousingStatus, isChecked: boolean) => {
    const statusList = [
      ...(filters.statusList ?? []).filter((_) => _ !== status),
      ...(isChecked ? [status] : []),
    ];
    onChangeFilters(
      {
        statusList,
        subStatus: filters.subStatus?.filter((_) =>
          getSubStatusList(statusList).includes(_),
        ),
      },
      'Statut',
    );
  };

  const { isVisitor } = useUser();

  return (
    <Drawer
      open={toggle.active}
      sx={(theme) => ({
        zIndex: theme.zIndex.appBar - 1,
        '& .MuiDrawer-root': {
          position: 'relative',
          zIndex: theme.zIndex.appBar - 1,
        },
        '& .MuiPaper-root': {
          padding: '1rem',
          position: 'relative',
        },
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
          alignSelf: toggle.active ? 'flex-end' : 'center',
        }}
        title={toggle.active ? 'Fermer' : 'Ouvrir'}
        onClick={() => toggle.toggle()}
      >
        {toggle.active ? 'Réduire' : undefined}
      </Button>

      <GroupHeader
        className={classNames('fr-mb-4w', styles.drawerContent, {
          [styles.drawerContentExpanded]: toggle.active,
        })}
      />

      <hr
        className={classNames('fr-pb-4w', styles.drawerContent, {
          [styles.drawerContentExpanded]: toggle.active,
        })}
      />

      <Grid
        className={classNames(styles.drawerContent, {
          [styles.drawerContentExpanded]: toggle.active,
        })}
        xs
      >
        <Grid
          alignItems="center"
          component="header"
          container
          mb={1}
          justifyContent="space-between"
        >
          <Grid component="section" xs="auto">
            <Typography variant="h6">Filtres</Typography>
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
              options={getSubStatusListOptions(filters.statusList)}
              initialValues={filters.subStatus}
              onChange={(values) =>
                onChangeFilters({ subStatus: values }, 'Sous-statut')
              }
            />
          </Grid>
          {campaigns && (
            <Grid component="article" mb={2} xs={12}>
              <AppMultiSelect
                label="Campagne"
                options={campaigns.map((c) => ({
                  value: c.id,
                  label: c.title,
                }))}
                initialValues={filters.campaignIds}
                onChange={(values) =>
                  onChangeFilters({ campaignIds: values }, 'Campagne')
                }
              />
            </Grid>
          )}
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Prise de contact"
              options={campaignsCountOptions}
              initialValues={filters.campaignsCounts}
              onChange={(values) =>
                onChangeFilters({ campaignsCounts: values }, 'Prise de contact')
              }
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
              onChange={(values) =>
                onChangeFilters({ occupancies: values }, 'Statut d’occupation')
              }
            />
          </Grid>
        </Accordion>
        <Accordion
          label={
            <TitleWithIcon icon="fr-icon-france-line" title="Localisation" />
          }
        >
          <Grid component="article" mb={2} xs={12}>
            <SearchableSelect
              options={unselectedOptions(localitiesOptions, filters.localities)}
              label="Commune"
              placeholder="Rechercher une commune"
              onChange={(value: string) => {
                if (value) {
                  onChangeFilters(
                    { localities: concat(filters.localities, value) },
                    'Commune',
                  );
                }
              }}
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Type de commune"
              options={localityKindsOptions}
              initialValues={filters.localityKinds}
              onChange={(values) =>
                onChangeFilters({ localityKinds: values }, 'Type de commune')
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <SearchableSelect
              options={unselectedOptions(
                geoPerimeterOptions(geoPerimeters),
                filters.geoPerimetersIncluded,
              )}
              label="Périmètre inclus"
              placeholder="Rechercher un périmètre"
              onChange={(value: string) => {
                if (value) {
                  onChangeFilters(
                    {
                      geoPerimetersIncluded: concat(
                        filters.geoPerimetersIncluded,
                        value,
                      ),
                    },
                    'Périmètre inclus',
                  );
                }
              }}
            />
          </Grid>
          <Grid component="article" mb={0} xs={12}>
            <SearchableSelect
              options={unselectedOptions(
                geoPerimeterOptions(geoPerimeters),
                filters.geoPerimetersExcluded,
              )}
              label="Périmètre exclu"
              placeholder="Rechercher un périmètre"
              onChange={(value: string) => {
                if (value) {
                  onChangeFilters(
                    {
                      geoPerimetersExcluded: concat(
                        filters.geoPerimetersExcluded,
                        value,
                      ),
                    },
                    'Périmètre exclu',
                  );
                }
              }}
            />

            { !isVisitor && <GeoPerimetersModalLink /> }
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
              onChange={(values) =>
                onChangeFilters(
                  { housingCounts: values },
                  'Nombre de logements',
                )
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Taux de vacance"
              options={vacancyRateOptions}
              initialValues={filters.vacancyRates}
              onChange={(values) =>
                onChangeFilters({ vacancyRates: values }, 'Taux de vacance')
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Étiquette DPE représentatif (CSTB)"
              options={energyConsumptionOptions}
              initialValues={filters.energyConsumption}
              onChange={(values) =>
                onChangeFilters(
                  { energyConsumption: values },
                  'Étiquette DPE représentatif (CSTB)',
                )
              }
            />
          </Grid>
        </Accordion>
        <Accordion
          label={<TitleWithIcon icon="fr-icon-home-4-line" title="Logement" />}
        >
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Type"
              options={housingKindOptions}
              initialValues={filters.housingKinds}
              onChange={(values) =>
                onChangeFilters({ housingKinds: values }, 'Type')
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Date de construction"
              options={buildingPeriodOptions}
              initialValues={filters.buildingPeriods}
              onChange={(values) =>
                onChangeFilters(
                  { buildingPeriods: values },
                  'Date de construction',
                )
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Surface"
              options={housingAreaOptions}
              initialValues={filters.housingAreas}
              onChange={(values) =>
                onChangeFilters({ housingAreas: values }, 'Surface')
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Durée de vacance"
              options={vacancyDurationOptions}
              initialValues={filters.vacancyDurations}
              onChange={(values) =>
                onChangeFilters(
                  { vacancyDurations: values },
                  'Durée de vacance',
                )
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Nombre de pièces"
              options={roomsCountOptions}
              initialValues={filters.roomsCounts ?? []}
              onChange={(values) =>
                onChangeFilters({ roomsCounts: values }, 'Nombre de pièces')
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Taxé"
              options={taxedOptions}
              initialValues={filters.isTaxedValues}
              onChange={(values) =>
                onChangeFilters(
                  { isTaxedValues: values as OwnershipKinds[] },
                  'Taxé',
                )
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Classement cadastral"
              options={cadastralClassificationOptions}
              initialValues={filters.cadastralClassifications}
              onChange={(values) =>
                onChangeFilters(
                  { cadastralClassifications: values },
                  'Classement cadastral',
                )
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Type de propriété"
              options={ownershipKindsOptions}
              initialValues={filters.ownershipKinds}
              onChange={(values) =>
                onChangeFilters({ ownershipKinds: values }, 'Type de propriété')
              }
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
                label="Type"
                options={ownerKindOptions}
                initialValues={filters.ownerKinds}
                onChange={(values) =>
                  onChangeFilters({ ownerKinds: values }, 'Type')
                }
              />
            </div>
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Âge"
              options={ownerAgeOptions}
              initialValues={filters.ownerAges}
              onChange={(values) =>
                onChangeFilters({ ownerAges: values }, 'Âge')
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Multi-propriétaire"
              options={multiOwnerOptions}
              initialValues={filters.multiOwners}
              onChange={(values) =>
                onChangeFilters({ multiOwners: values }, 'Multi-propriétaire')
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Ayants droit"
              options={beneficiaryCountOptions}
              initialValues={filters.beneficiaryCounts}
              onChange={(values) =>
                onChangeFilters({ beneficiaryCounts: values }, 'Ayants droit')
              }
            />
          </Grid>
        </Accordion>
        <Accordion
          label={
            <TitleWithIcon icon="fr-icon-calendar-line" title="Millésime" />
          }
        >
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Millésime inclus"
              options={dataYearsIncludedOptions}
              initialValues={(filters.dataYearsIncluded ?? []).map((_) =>
                String(_),
              )}
              onChange={(values) =>
                onChangeFilters(
                  { dataYearsIncluded: values.map(Number) },
                  'Millésime inclus',
                )
              }
            />
          </Grid>
          <Grid component="article" mb={2} xs={12}>
            <AppMultiSelect
              label="Millésime exclu"
              defaultOption="Aucun"
              options={dataYearsExcludedOptions}
              initialValues={(filters.dataYearsExcluded ?? []).map((_) =>
                String(_),
              )}
              onChange={(values) =>
                onChangeFilters(
                  { dataYearsExcluded: values.map(Number) },
                  'Millésime exclu',
                )
              }
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
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme),
  }),
}));

export default HousingListFiltersSidemenu;
