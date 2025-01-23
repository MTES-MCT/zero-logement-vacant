import Button from '@codegouvfr/react-dsfr/Button';
import Tabs, { TabsProps } from '@codegouvfr/react-dsfr/Tabs';
import Tag from '@codegouvfr/react-dsfr/Tag';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fromJS } from 'immutable';
import { FormProvider, useController, useForm } from 'react-hook-form';
import { ElementOf } from 'ts-essentials';
import * as yup from 'yup';

import {
  HOUSING_STATUS_VALUES,
  HousingStatus,
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory,
  Occupancy,
  OCCUPANCY_VALUES,
  Precision
} from '@zerologementvacant/models';
import { Housing, HousingUpdate } from '../../models/Housing';
import AppLink from '../_app/AppLink/AppLink';
import AsideNext from '../Aside/AsideNext';
import LabelNext from '../Label/LabelNext';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import {
  allOccupancyOptions,
  statusOptions
} from '../../models/HousingFilters';
import HousingStatusSelect from './HousingStatusSelect';
import { getSubStatusOptions } from '../../models/HousingState';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import { useCreateNoteByHousingMutation } from '../../services/note.service';
import { useUpdateHousingNextMutation } from '../../services/housing.service';
import { useNotification } from '../../hooks/useNotification';
import { toNewPrecision } from '../../models/Precision';
import createPrecisionModalNext from '../Precision/PrecisionModalNext';
import { useState } from 'react';
import { PrecisionTabId } from '../Precision/PrecisionTabs';

interface HousingEditionSideMenuProps {
  housing: Housing | null;
  expand: boolean;
  onSubmit?: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const WIDTH = '700px';

const schema = yup.object({
  occupancy: yup
    .string()
    .required('Veuillez renseigner l’occupation actuelle')
    .oneOf(OCCUPANCY_VALUES),
  occupancyIntended: yup
    .string()
    .oneOf(OCCUPANCY_VALUES)
    .nullable()
    .optional()
    .default(null),
  status: yup
    .number()
    .required('Veuillez renseigner le statut de suivi')
    .oneOf(HOUSING_STATUS_VALUES),
  subStatus: yup.string().trim().nullable().optional().default(null),
  note: yup.string()
});

type FormSchema = yup.InferType<typeof schema>;

const precisionModal = createPrecisionModalNext();

function HousingEditionSideMenu(props: HousingEditionSideMenuProps) {
  const { housing, expand, onClose } = props;
  const form = useForm<FormSchema>({
    values: {
      occupancy: props.housing?.occupancy ?? Occupancy.UNKNOWN,
      occupancyIntended: props.housing?.occupancyIntended ?? Occupancy.UNKNOWN,
      status: props.housing?.status ?? HousingStatus.NEVER_CONTACTED,
      subStatus: props.housing?.subStatus ?? '',
      note: ''
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  const [createNote, noteCreationMutation] = useCreateNoteByHousingMutation();
  const [updateHousing, housingUpdateMutation] = useUpdateHousingNextMutation();

  useNotification({
    toastId: 'note-creation',
    isError: noteCreationMutation.isError,
    isLoading: noteCreationMutation.isLoading,
    isSuccess: noteCreationMutation.isSuccess,
    message: {
      error: 'Impossible de créer la note',
      loading: 'Création de la note...',
      success: 'Note créée !'
    }
  });
  useNotification({
    toastId: 'housing-update',
    isError: housingUpdateMutation.isError,
    isLoading: housingUpdateMutation.isLoading,
    isSuccess: housingUpdateMutation.isSuccess,
    message: {
      error: 'Impossible de mettre à jour le logement',
      loading: 'Mise à jour du logement...',
      success: 'Logement mis à jour !'
    }
  });

  function submit() {
    if (housing) {
      const { note, ...payload } = form.getValues();

      const hasChanges = fromJS(form.formState.dirtyFields)
        .filterNot((_, key) => key === 'note')
        .some((value) => !!value);
      if (hasChanges) {
        updateHousing({
          ...housing,
          // TODO: directly pass payload whenever
          //  Housing and HousingDTO are aligned
          occupancy: payload.occupancy as Occupancy,
          occupancyIntended: payload.occupancyIntended as Occupancy | null,
          status: payload.status as HousingStatus,
          subStatus: payload.subStatus
        });
      }

      if (note) {
        createNote({
          id: housing.id,
          content: note
        });
      }
    }

    onClose();
    form.reset();
  }

  function OccupationTab(): ElementOf<TabsProps.Uncontrolled['tabs']> {
    return {
      content: (
        <Stack rowGap={2}>
          <AppSelectNext
            label="Occupation actuelle"
            multiple={false}
            name="occupancy"
            options={allOccupancyOptions}
          />
          <AppSelectNext
            label="Occupation prévisionnelle"
            multiple={false}
            name="occupancyIntended"
            options={allOccupancyOptions}
          />
        </Stack>
      ),
      isDefault: true,
      label: 'Occupation'
    };
  }

  function MobilisationTab(): ElementOf<TabsProps.Uncontrolled['tabs']> {
    // TODO: implement `GET /precisions` to remove this hardcoded list
    const precisionOptions: Precision[] = [
      {
        id: 'df989b58-c8a6-4f4d-8240-d69c2b9150ce',
        category: 'dispositifs-incitatifs',
        label: 'Conventionnement avec travaux'
      },
      {
        id: '9457efb2-0bde-4964-ab67-3085187855ae',
        category: 'dispositifs-incitatifs',
        label: 'Conventionnement sans travaux'
      },
      {
        id: '4fc3cbf2-e564-49ab-bead-85e3be8c2a84',
        category: 'dispositifs-incitatifs',
        label: 'Aides locales travaux'
      },
      {
        id: 'f329d2ba-ecde-4e70-904e-ac0137ac8a1b',
        category: 'dispositifs-incitatifs',
        label: 'Aides à la gestion locative'
      },
      {
        id: '8905fd8c-364a-4701-ac75-5f8817c454f0',
        category: 'dispositifs-incitatifs',
        label: 'Intermédiation Locative (IML)'
      },
      {
        id: 'bca88947-2a67-4bc9-ab72-37eb7b062113',
        category: 'dispositifs-incitatifs',
        label: 'Dispositif fiscal'
      },
      {
        id: '5d0e2fde-9653-4f2c-8587-277fe1ad33a0',
        category: 'dispositifs-incitatifs',
        label: 'Prime locale vacance'
      },
      {
        id: '53f7b197-6f9b-405f-9808-fa342e335ad5',
        category: 'dispositifs-incitatifs',
        label: 'Prime vacance France Ruralités'
      },
      {
        id: 'ad8d2d73-2222-42f8-9bc4-3ba648aa2bbc',
        category: 'dispositifs-incitatifs',
        label: 'Ma Prime Renov'
      },
      {
        id: 'f9f7f336-e003-4a2d-b4a5-b2d3d9745215',
        category: 'dispositifs-incitatifs',
        label: 'Prime Rénovation Globale'
      },
      {
        id: 'df5118e4-de5b-4cdd-9d0b-1196c58cbb88',
        category: 'dispositifs-incitatifs',
        label: 'Prime locale rénovation énergétique'
      },
      {
        id: '252909d6-f61e-42a8-a608-87971ee60602',
        category: 'dispositifs-incitatifs',
        label: 'Accompagnement à la vente'
      },
      {
        id: '5165ae82-65d2-4f04-b8c5-ccd063f09178',
        category: 'dispositifs-incitatifs',
        label: 'Autre'
      },
      {
        id: '3fc430c3-4748-4523-b188-746134f39355',
        category: 'dispositifs-coercitifs',
        label: 'ORI - TIROIR'
      },
      {
        id: '4601da9d-0d20-4870-aaae-b72315bcab79',
        category: 'dispositifs-coercitifs',
        label: 'Bien sans maître'
      },
      {
        id: '60cf309b-f186-4abd-a643-11500555edbb',
        category: 'dispositifs-coercitifs',
        label: 'Abandon manifeste'
      },
      {
        id: 'da792337-a808-4eb4-85a9-1aa2a712e914',
        category: 'dispositifs-coercitifs',
        label: 'DIA - préemption'
      },
      {
        id: '418eee4f-45fb-4ec3-8c85-e48d5c83c64d',
        category: 'dispositifs-coercitifs',
        label: 'Procédure d’habitat indigne'
      },
      {
        id: 'a5469c8f-64ef-44db-8315-6bf647039849',
        category: 'dispositifs-coercitifs',
        label: 'Permis de louer'
      },
      {
        id: '360eee86-6fe6-4b80-bf1d-789a8c4d7919',
        category: 'dispositifs-coercitifs',
        label: 'Permis de diviser'
      },
      {
        id: '99474b59-0f26-4341-8226-29abf540393e',
        category: 'dispositifs-coercitifs',
        label: 'Autre'
      },
      {
        id: 'dc3be923-0d7b-4a03-adeb-93a5018e03c9',
        category: 'hors-dispositif-public',
        label:
          'Accompagné par un professionnel (architecte, agent immobilier, etc.)'
      },
      {
        id: 'c3645101-df88-49bb-94ef-7b93a99f678d',
        category: 'hors-dispositif-public',
        label: 'Propriétaire autonome'
      },
      {
        id: '174dd3df-fad9-4e85-b2f3-ec287c3e32d9',
        category: 'blocage-involontaire',
        label: 'Mise en location ou vente infructueuse'
      },
      {
        id: '7d442747-d27c-4621-918c-65f416a68d1d',
        category: 'blocage-involontaire',
        label: 'Succession difficile, indivision en désaccord'
      },
      {
        id: '6bec7b77-2f02-47f1-98c6-36aaaeb81faf',
        category: 'blocage-involontaire',
        label: 'Défaut d’entretien / Nécessité de travaux'
      },
      {
        id: '94caba4c-4f93-4181-ad64-107acb5149c5',
        category: 'blocage-involontaire',
        label: 'Problème de financement / Dossier non-éligible'
      },
      {
        id: '87da78a3-ac64-49a2-a03d-1eeeb568ec84',
        category: 'blocage-involontaire',
        label: 'Manque de conseils en amont de l’achat'
      },
      {
        id: '083638a8-6638-44d6-ab63-58ae31d5543e',
        category: 'blocage-involontaire',
        label: 'En incapacité (âge, handicap, précarité ...)'
      },
      {
        id: 'dcc49583-3145-4022-a4b5-58f70e846ff8',
        category: 'blocage-volontaire',
        label: 'Réserve personnelle ou pour une autre personne'
      },
      {
        id: 'a3291e85-4641-46e3-bcbd-e6776ec5ad9d',
        category: 'blocage-volontaire',
        label: 'Stratégie de gestion'
      },
      {
        id: '14144fa6-87f0-4214-be1f-e59ebf62ed6f',
        category: 'blocage-volontaire',
        label: 'Mauvaise expérience locative'
      },
      {
        id: '95f74ebc-8aa1-4762-b0bb-a8871769814c',
        category: 'blocage-volontaire',
        label: 'Montants des travaux perçus comme trop importants'
      },
      {
        id: '86dff4f5-5eb7-4610-963b-8cc9b29c100b',
        category: 'blocage-volontaire',
        label: 'Refus catégorique, sans raison'
      },
      {
        id: '69619020-9614-4c08-8f2f-2d75f22650f0',
        category: 'immeuble-environnement',
        label: 'Pas d’accès indépendant'
      },
      {
        id: '2e68a3de-8f1f-49a4-b723-15b6eb6665ca',
        category: 'immeuble-environnement',
        label: 'Immeuble dégradé'
      },
      {
        id: '5508da10-c523-432a-9033-d55d830aae48',
        category: 'immeuble-environnement',
        label: 'Ruine / Immeuble à démolir'
      },
      {
        id: '131c99a8-d6e6-41cd-a539-80fcd53cadc2',
        category: 'immeuble-environnement',
        label: 'Nuisances à proximité'
      },
      {
        id: '06403671-87e9-416f-817b-e6352277ca1d',
        category: 'immeuble-environnement',
        label: 'Risques Naturels / Technologiques'
      },
      {
        id: 'ef404dac-5f34-45ce-bc25-46b1c3a9b47c',
        category: 'tiers-en-cause',
        label: 'Entreprise(s) en défaut'
      },
      {
        id: '6ddae597-ebcd-4553-9cf3-533fd175f225',
        category: 'tiers-en-cause',
        label: 'Copropriété en désaccord'
      },
      {
        id: 'c96e46e4-1062-486c-8e20-17cfbe5d87ae',
        category: 'tiers-en-cause',
        label: 'Expertise judiciaire'
      },
      {
        id: '6e090e41-29e9-4156-9eb6-da3842f0bb02',
        category: 'tiers-en-cause',
        label: 'Autorisation d’urbanisme refusée / Blocage ABF'
      },
      {
        id: '96790167-2a81-4dbe-8f5a-39dbbdbc6cd5',
        category: 'tiers-en-cause',
        label: 'Interdiction de location'
      },
      {
        id: '47ec5b6b-5114-4303-98ee-ce029e17d73c',
        category: 'travaux',
        label: 'À venir'
      },
      {
        id: 'e7a3f116-0dc0-4afa-9ecb-c0fed50cdc94',
        category: 'travaux',
        label: 'En cours'
      },
      {
        id: 'eb5b46b3-efb0-4ffe-827c-cf94f7b9fc5c',
        category: 'travaux',
        label: 'Terminés'
      },
      {
        id: 'e95ae7cb-c916-44a7-97de-49a4c4853fe8',
        category: 'occupation',
        label: 'À venir'
      },
      {
        id: '0b799bf9-2803-432d-bc07-8071864fc5ac',
        category: 'occupation',
        label: 'En cours'
      },
      {
        id: '9fe7eec0-0eea-4ffb-9058-c284ce99168e',
        category: 'occupation',
        label: 'Nouvelle occupation'
      },
      {
        id: 'fee7a6c5-4f71-4844-b92b-7cb4c5441549',
        category: 'mutation',
        label: 'À venir'
      },
      {
        id: 'e8781301-966d-40dc-9358-6e1f4af1ea76',
        category: 'mutation',
        label: 'En cours'
      },
      {
        id: 'c7b29831-9dec-4e99-9ec9-4998ca99b763',
        category: 'mutation',
        label: 'Effectuée'
      }
    ];
    const precisions =
      housing?.precisions
        ?.concat(housing?.vacancyReasons ?? [])
        ?.map((precision) => toNewPrecision(precisionOptions, precision)) ?? [];
    const mechanisms = precisions.filter((precision) =>
      isPrecisionMechanismCategory(precision.category)
    );
    const blockingPoints = precisions.filter((precision) =>
      isPrecisionBlockingPointCategory(precision.category)
    );
    const evolutions = precisions.filter((precision) =>
      isPrecisionEvolutionCategory(precision.category)
    );
    const [tab, setTab] = useState<PrecisionTabId>('dispositifs');

    const { field: statusField, fieldState: statusFieldState } =
      useController<FormSchema>({
        name: 'status',
        control: form.control
      });

    // Immediately save the selected precisions
    function savePrecisions(precisions: Precision[]) {
      if (housing) {
        updateHousing({
          ...housing,
          occupancy: housing.occupancy as Occupancy,
          occupancyIntended: housing.occupancyIntended as Occupancy,
          precisions: precisions.map((p) => p.id)
        });
      }
    }

    return {
      content: (
        <Grid component="section" container sx={{ rowGap: 2 }}>
          <Grid
            component="article"
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            xs={12}
          >
            <Typography
              component="h3"
              sx={{ fontSize: '1.125rem', fontWeight: 700 }}
            >
              Statut de suivi
            </Typography>
            <HousingStatusSelect
              selected={statusField.value as HousingStatus}
              message={statusFieldState.error?.message}
              messageType={statusFieldState.invalid ? 'error' : 'default'}
              options={statusOptions()}
              onChange={(status) => {
                statusField.onChange(status);
              }}
            />
            <AppSelectNext
              disabled={
                getSubStatusOptions(statusField.value as HousingStatus) ===
                undefined
              }
              label="Sous-statut de suivi"
              name="subStatus"
              multiple={false}
              options={
                getSubStatusOptions(statusField.value as HousingStatus) ?? []
              }
            />
          </Grid>

          <Grid
            component="article"
            container
            sx={{ alignItems: 'center', columnGap: 2, rowGap: 1 }}
            xs={12}
          >
            <Grid
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              xs={12}
            >
              <Typography
                component="h3"
                sx={{
                  display: 'inline-block',
                  fontSize: '1.125rem',
                  fontWeight: 700
                }}
              >
                Dispositifs ({mechanisms.length})
              </Typography>
              <Button
                priority="secondary"
                title="Modifier les dispositifs"
                onClick={() => {
                  setTab('dispositifs');
                  precisionModal.open();
                }}
              >
                Modifier
              </Button>
            </Grid>
            <Grid>
              {mechanisms.map((precision) => (
                <Tag key={precision.id}>{precision.label}</Tag>
              ))}
            </Grid>
          </Grid>

          <Grid
            component="article"
            container
            sx={{ alignItems: 'center', columnGap: 2, rowGap: 1 }}
            xs={12}
          >
            <Grid
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              xs={12}
            >
              <Typography
                component="h3"
                sx={{
                  display: 'inline-block',
                  fontSize: '1.125rem',
                  fontWeight: 700
                }}
              >
                Points de blocages ({blockingPoints.length})
              </Typography>
              <Button
                priority="secondary"
                title="Modifier les points de blocage"
                onClick={() => {
                  setTab('points-de-blocage');
                  precisionModal.open();
                }}
              >
                Modifier
              </Button>
            </Grid>
            <Grid>
              {blockingPoints.map((precision) => (
                <Tag key={precision.id}>{precision.label}</Tag>
              ))}
            </Grid>
          </Grid>

          <Grid
            component="article"
            container
            sx={{ alignItems: 'center', columnGap: 2 }}
            xs={12}
          >
            <Grid
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              xs={12}
            >
              <Typography
                component="h3"
                sx={{ fontSize: '1.125rem', fontWeight: 700 }}
              >
                Évolutions du logement ({evolutions.length})
              </Typography>
              <Button
                priority="secondary"
                title="Modifier les évolutions du logement"
                onClick={() => {
                  setTab('evolutions');
                  precisionModal.open();
                }}
              >
                Modifier
              </Button>
            </Grid>
            <Grid>
              {evolutions.map((precision) => (
                <Tag key={precision.id}>{precision.label}</Tag>
              ))}
            </Grid>
          </Grid>

          <precisionModal.Component
            tab={tab}
            options={precisionOptions}
            value={precisions}
            onSubmit={savePrecisions}
            onTabChange={setTab}
          />
        </Grid>
      ),
      label: 'Mobilisation'
    };
  }

  function NoteTab(): ElementOf<TabsProps.Uncontrolled['tabs']> {
    return {
      content: (
        <AppTextInputNext
          label="Nouvelle note"
          name="note"
          nativeTextAreaProps={{ rows: 8 }}
          textArea
        />
      ),
      label: 'Note'
    };
  }

  return (
    <AsideNext
      drawerProps={{
        sx: (theme) => ({
          zIndex: theme.zIndex.appBar + 1,
          '& .MuiDrawer-paper': {
            px: '1.5rem',
            py: '2rem',
            width: WIDTH
          }
        })
      }}
      header={
        <Box component="header">
          <Typography variant="h6">
            {props.housing?.rawAddress.join(' - ')}
          </Typography>
          <LabelNext>
            Identifiant fiscal national : {props.housing?.localId}
          </LabelNext>
          <AppLink
            style={{ display: 'block' }}
            to={`/logements/${props.housing?.id}`}
            isSimple
            target="_blank"
          >
            Voir la fiche logement dans un nouvel onglet
          </AppLink>
        </Box>
      }
      main={
        <FormProvider {...form}>
          <Tabs tabs={[OccupationTab(), MobilisationTab(), NoteTab()]} />
        </FormProvider>
      }
      open={expand}
      onClose={onClose}
      onSave={form.handleSubmit(submit)}
    />
  );
}

export default HousingEditionSideMenu;
