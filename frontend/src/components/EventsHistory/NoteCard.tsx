import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import { yupResolver } from '@hookform/resolvers/yup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { NotePayloadDTO } from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import { format } from 'date-fns';
import localeFR from 'date-fns/locale/fr';
import { useMemo, useState } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { match } from 'ts-pattern';
import { useNotification } from '../../hooks/useNotification';
import { useUser } from '../../hooks/useUser';

import { Establishment } from '../../models/Establishment';
import { Note } from '../../models/Note';
import { formatAuthor } from '../../models/User';
import {
  useRemoveNoteMutation,
  useUpdateNoteMutation
} from '../../services/note.service';
import AppBadge from '../_app/AppBadge/AppBadge';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import { createConfirmationModal } from '../modals/ConfirmationModal/ConfirmationModalNext';
import HistoryCard from './HistoryCard';

export interface NoteCardProps {
  note: Note;
  establishment: Pick<Establishment, 'name'> | null;
}

function NoteCard(props: NoteCardProps) {
  const createdOn: string = format(
    new Date(props.note.createdAt),
    'dd/MM/yyyy',
    { locale: localeFR }
  );
  const createdAt: string = format(new Date(props.note.createdAt), 'HH:mm', {
    locale: localeFR
  });
  const updatedOn: string | null = props.note.updatedAt
    ? format(new Date(props.note.updatedAt), 'dd/MM/yyyy', {
        locale: localeFR
      })
    : null;
  const updatedAt: string | null = props.note.updatedAt
    ? format(new Date(props.note.updatedAt), 'HH:mm', {
        locale: localeFR
      })
    : null;

  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const form = useForm<NotePayloadDTO>({
    defaultValues: {
      content: props.note.content
    },
    mode: 'onSubmit',
    resolver: yupResolver(schemas.notePayload)
  });

  const { isAdmin, isUsual, user } = useUser();
  const canUpdate = isAdmin || (isUsual && user?.id === props.note.createdBy);

  const removeModal = useMemo(
    () =>
      createConfirmationModal({
        id: `delete-note-${props.note.id}`,
        isOpenedByDefault: false
      }),
    [props.note.id]
  );

  function cancel() {
    setMode('view');
  }

  const [updateNote, updateNoteMutation] = useUpdateNoteMutation();
  useNotification({
    toastId: 'update-note',
    isError: updateNoteMutation.isError,
    isLoading: updateNoteMutation.isLoading,
    isSuccess: updateNoteMutation.isSuccess,
    message: {
      error: 'Erreur lors de la mise à jour de la note.',
      loading: 'Mise à jour de la note...',
      success: 'Note mise à jour !'
    }
  });

  const update: SubmitHandler<NotePayloadDTO> = (note) => {
    setMode('view');
    if (note.content !== props.note.content) {
      updateNote({
        id: props.note.id,
        content: note.content
      });
    }
  };

  const [removeNote, removeNoteMutation] = useRemoveNoteMutation();
  useNotification({
    toastId: 'remove-note',
    isError: removeNoteMutation.isError,
    isLoading: removeNoteMutation.isLoading,
    isSuccess: removeNoteMutation.isSuccess,
    message: {
      error: 'Erreur lors de la suppression de la note.',
      loading: 'Suppression de la note...',
      success: 'Note supprimée !'
    }
  });

  function remove() {
    removeModal.close();
    removeNote(props.note);
  }

  return (
    <HistoryCard icon="ri-message-line">
      <removeModal.Component
        className="fr-ml-0"
        title="Suppression d’une note"
        onSubmit={remove}
      >
        Êtes-vous sûr de vouloir supprimer cette note ?
      </removeModal.Component>

      <Stack
        aria-label="Note"
        component="section"
        sx={{
          border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
          padding: '1rem',
          flexGrow: 1
        }}
      >
        <AppBadge className="fr-mb-1w" colorFamily="orange-terre-battue" small>
          Note
        </AppBadge>

        <Stack
          direction="row"
          spacing="1rem"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: '0.75rem'
          }}
        >
          <Stack>
            <Typography>
              <Typography sx={{ fontWeight: 700 }} component="span">
                {formatAuthor(props.note.creator, props.establishment)}
              </Typography>
              <Typography component="span">
                &nbsp;le {createdOn} à {createdAt}
              </Typography>
            </Typography>

            {!props.note.updatedAt ? null : (
              <Typography>
                Modifié le {updatedOn} à {updatedAt}
              </Typography>
            )}
          </Stack>

          {mode === 'view' && canUpdate ? (
            <Stack direction="row" spacing="0.5rem">
              <Button
                nativeButtonProps={{ 'aria-label': 'Éditer la note' }}
                priority="secondary"
                iconId="fr-icon-edit-line"
                iconPosition="left"
                size="small"
                onClick={() => {
                  setMode('edit');
                }}
              >
                Éditer
              </Button>
              <Button
                nativeButtonProps={{ 'aria-label': 'Supprimer la note' }}
                priority="tertiary"
                iconId="ri-delete-bin-line"
                iconPosition="left"
                size="small"
                onClick={() => {
                  removeModal.open();
                }}
              >
                Supprimer
              </Button>
            </Stack>
          ) : null}
        </Stack>

        {match(mode)
          .with('view', () => <Typography>{props.note.content}</Typography>)
          .with('edit', () => (
            <FormProvider {...form}>
              <AppTextInputNext
                label={null}
                nativeTextAreaProps={{ 'aria-label': 'Contenu de la note' }}
                name="content"
                textArea
              />
              <ButtonsGroup
                buttons={[
                  {
                    children: 'Annuler',
                    priority: 'secondary',
                    onClick: cancel
                  },
                  {
                    children: 'Enregistrer',
                    nativeButtonProps: {
                      'aria-label': 'Enregistrer la note'
                    },
                    onClick: form.handleSubmit(update)
                  }
                ]}
                alignment="right"
                inlineLayoutWhen="always"
              />
            </FormProvider>
          ))
          .exhaustive()}
      </Stack>
    </HistoryCard>
  );
}

export default NoteCard;
