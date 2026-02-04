import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query/react';
import {
  HOUSING_STATUS_VALUES,
  Occupancy,
  OCCUPANCY_VALUES,
  PRECISION_CATEGORY_VALUES,
  type DocumentDTO
} from '@zerologementvacant/models';
import {
  Controller,
  FormProvider,
  useForm,
  type SubmitHandler
} from 'react-hook-form';
import { useSet } from 'react-use';
import { match } from 'ts-pattern';
import { array, mixed, number, object, string, type InferType } from 'yup';

import { useHousing } from '~/hooks/useHousing';

import HousingEditionInformationTab from '~/components/HousingEdition/HousingEditionInformationTab';
import { useNotification } from '~/hooks/useNotification';
import { HousingStates } from '~/models/HousingState';
import {
  useDeleteDocumentMutation,
  useFindHousingDocumentsQuery,
  useLinkDocumentsToHousingMutation,
  useUnlinkDocumentMutation
} from '~/services/document.service';
import { useUpdateHousingMutation } from '~/services/housing.service';
import { useCreateNoteByHousingMutation } from '~/services/note.service';
import {
  useFindPrecisionsByHousingQuery,
  useSaveHousingPrecisionsMutation
} from '~/services/precision.service';
import type { Housing, HousingUpdate } from '../../models/Housing';
import AppLink from '../_app/AppLink/AppLink';
import AsideNext from '../Aside/AsideNext';
import DocumentsTab, {
  type DocumentsTabProps
} from '../HousingDetails/DocumentsTab';
import LabelNext from '../Label/LabelNext';
import HousingEditionMobilizationTab from './HousingEditionMobilizationTab';
import HousingEditionNoteTab from './HousingEditionNoteTab';
import type { HousingEditionContext } from './useHousingEdition';
import { useHousingEdition } from './useHousingEdition';

interface HousingEditionSideMenuProps {
  expand: boolean;
  onSubmit?: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const WIDTH = '700px';

const schema = object({
  occupancy: string()
    .required("Veuillez renseigner l'occupation actuelle")
    .oneOf(OCCUPANCY_VALUES),
  occupancyIntended: string()
    .oneOf(OCCUPANCY_VALUES)
    .required()
    .nullable()
    .default(null),
  status: number()
    .required('Veuillez renseigner le statut de suivi')
    .oneOf(HOUSING_STATUS_VALUES)
    .nullable(),
  subStatus: string()
    .trim()
    .required()
    .nullable()
    .when('status', ([status], schema) =>
      HousingStates.find((state) => state.status === status)?.subStatusList
        ?.length
        ? schema.required('Veuillez renseigner le sous-statut de suivi')
        : schema
    ),
  note: string().required().nullable(),
  precisions: array(
    object({
      id: string().required(),
      category: string().oneOf(PRECISION_CATEGORY_VALUES).required(),
      label: string().required()
    }).required()
  ).required(),
  documents: array(mixed<DocumentDTO>().required()).required(),
  actualEnergyConsumption: string()
    .oneOf(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    .nullable()
    .optional()
    .default(null)
}).required();

export type HousingEditionFormSchema = InferType<typeof schema>;

function HousingEditionSideMenu(props: HousingEditionSideMenuProps) {
  const { housing } = useHousing();
  const { tab, setTab } = useHousingEdition();

  const { data: existingDocuments = [] } = useFindHousingDocumentsQuery(
    housing?.id ?? skipToken
  );
  const { data: housingPrecisions } = useFindPrecisionsByHousingQuery(
    housing ? { housingId: housing.id } : skipToken
  );

  const form = useForm<HousingEditionFormSchema>({
    values: {
      occupancy: housing?.occupancy ?? Occupancy.UNKNOWN,
      occupancyIntended: housing?.occupancyIntended ?? null,
      status: housing?.status ?? null,
      subStatus: housing?.subStatus ?? null,
      note: null,
      precisions: housingPrecisions ?? [],
      // Documents are loaded separately and managed via onUpload/onDelete
      documents: [],
      actualEnergyConsumption: housing?.actualEnergyConsumption ?? null
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  const [createNote, noteCreationMutation] = useCreateNoteByHousingMutation();
  const [deleteDocument] = useDeleteDocumentMutation();
  const [updateHousing, housingUpdateMutation] = useUpdateHousingMutation();
  const [saveHousingPrecisions, saveHousingPrecisionsMutation] =
    useSaveHousingPrecisionsMutation();
  const [linkDocuments] = useLinkDocumentsToHousingMutation();
  const [unlinkDocument] = useUnlinkDocumentMutation();

  useNotification({
    toastId: 'note-creation',
    isError: noteCreationMutation.isError,
    isLoading: noteCreationMutation.isLoading,
    isSuccess: noteCreationMutation.isSuccess,
    message: {
      error: 'Impossible de créer la note',
      loading: 'Création de la note...',
      success:
        'Votre note a été correctement créée et enregistrée dans la section "Notes et historique" du logement.'
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
  useNotification({
    toastId: 'housing-precisions-update',
    isError: saveHousingPrecisionsMutation.isError,
    isLoading: saveHousingPrecisionsMutation.isLoading,
    isSuccess: saveHousingPrecisionsMutation.isSuccess,
    message: {
      error: 'Impossible de modifier les précisions du logement',
      loading: 'Modification des précisions du logement...',
      success: 'Précisions du logement modifiées'
    }
  });

  // Documents set to be removed later, on form submit
  const [
    removing,
    { add: addRemoving, has: isRemoving, reset: resetRemoving }
  ] = useSet<DocumentDTO['id']>();

  function cancel(): void {
    const documents = form.getValues('documents');
    documents?.forEach((document) => {
      deleteDocument(document.id);
    });
    props.onClose();
    form.reset();
    resetRemoving();
  }

  const { formState } = form;
  const { dirtyFields } = formState;

  const submit: SubmitHandler<HousingEditionFormSchema> = (data) => {
    if (housing) {
      const hasChanges =
        [
          dirtyFields.occupancy,
          dirtyFields.occupancyIntended,
          dirtyFields.status,
          dirtyFields.subStatus,
          dirtyFields.actualEnergyConsumption
        ].filter((value) => !!value).length > 0;
      if (hasChanges) {
        updateHousing({
          ...housing,
          occupancy: payload.occupancy ?? housing.occupancy,
          occupancyIntended:
            payload.occupancyIntended ?? housing.occupancyIntended,
          status: payload.status ?? housing.status,
          subStatus: payload.subStatus ?? housing.subStatus
        });
      }

      if (!!dirtyFields.precisions) {
        saveHousingPrecisions({
          housing: housing.id,
          precisions: payload.precisions.map((precision) => precision.id)
        });
      }

      if (removing.size > 0) {
        Array.from(removing.values()).forEach((documentId) => {
          unlinkDocument({
            housingId: housing.id,
            documentId: documentId
          });
        });
      }

      if (payload.documents?.length) {
        linkDocuments({
          housingId: housing.id,
          documentIds: payload.documents.map((document) => document.id)
        });
      }

      if (payload.note) {
        createNote({
          id: housing.id,
          content: payload.note
        });
      }
    }

    props.onClose();
    form.reset();
    resetRemoving();
  };

  const onUpload: DocumentsTabProps['onUpload'] = (documents) => {
    const currentDocuments = form.getValues('documents');
    form.setValue('documents', [...currentDocuments, ...documents]);
  };

  const onDelete: DocumentsTabProps['onDelete'] = (document) => {
    const existedBefore = existingDocuments.some(
      (existing) => existing.id === document.id
    );
    if (existedBefore) {
      addRemoving(document.id);
    } else {
      deleteDocument(document.id);
      form.setValue(
        'documents',
        form.getValues('documents').filter(({ id }) => id !== document.id)
      );
    }
  };

  const content = match(tab)
    .with('occupancy', () => <HousingEditionInformationTab housing={housing} />)
    .with('documents', () => (
      <Controller
        control={form.control}
        name="documents"
        render={({ field }) => (
          <DocumentsTab
            documents={[
              ...field.value,
              ...existingDocuments.filter(
                (document) => !isRemoving(document.id)
              )
            ]}
            documentCardProps={{ actions: 'remove-only' }}
            isLoading={false}
            isSuccess={true}
            onUpload={onUpload}
            onRename={() => {}}
            onDelete={onDelete}
          />
        )}
      />
    ))
    .with('mobilization', () => <HousingEditionMobilizationTab />)
    .with('note', () => (
      <HousingEditionNoteTab housingId={housing?.id ?? null} />
    ))
    .exhaustive();

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
            {housing?.rawAddress.join(' - ')}
          </Typography>
          <LabelNext>
            Identifiant fiscal national : {housing?.localId}
          </LabelNext>
          <AppLink
            style={{ display: 'block' }}
            to={`/logements/${housing?.id}`}
            isSimple
            target="_blank"
          >
            Voir la fiche logement dans un nouvel onglet
          </AppLink>
        </Box>
      }
      main={
        <FormProvider {...form}>
          <Tabs
            tabs={[
              { tabId: 'occupancy', label: 'Informations sur le logement' },
              { tabId: 'mobilization', label: 'Suivi' },
              { tabId: 'documents', label: 'Documents' },
              { tabId: 'note', label: 'Note' }
            ]}
            selectedTabId={tab}
            onTabChange={(tab: string) => {
              setTab(tab as HousingEditionContext['tab']);
            }}
          >
            {content}
          </Tabs>
        </FormProvider>
      }
      open={props.expand}
      onClose={cancel}
      onSave={form.handleSubmit(submit)}
    />
  );
}

export default HousingEditionSideMenu;
