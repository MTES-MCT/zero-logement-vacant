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
import { useState } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { match } from 'ts-pattern';
import { useNotification } from '../../hooks/useNotification';
import { useUser } from '../../hooks/useUser';

import { Establishment } from '../../models/Establishment';
import { Note } from '../../models/Note';
import { formatAuthor } from '../../models/User';
import { useUpdateNoteMutation } from '../../services/note.service';
import AppBadge from '../_app/AppBadge/AppBadge';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import HistoryCard from './HistoryCard';

export interface NoteCardProps {
  note: Note;
  establishment: Pick<Establishment, 'name'> | null;
}

function NoteCard(props: NoteCardProps) {
  const date: string = format(new Date(props.note.createdAt), 'dd/MM/yyyy', {
    locale: localeFR
  });
  const time: string = format(new Date(props.note.createdAt), 'HH:mm', {
    locale: localeFR
  });

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

  function cancel() {
    setMode('view');
  }

  const [updateNote, updateNoteMutation] = useUpdateNoteMutation();
  useNotification({
    toastId: 'update-note',
    isError: updateNoteMutation.isError,
    isSuccess: updateNoteMutation.isSuccess,
    isLoading: updateNoteMutation.isLoading,
    message: {
      error: 'Erreur lors de la mise à jour de la note.',
      loading: 'Mise à jour de la note...',
      success: 'Note mise à jour !'
    }
  });

  const save: SubmitHandler<NotePayloadDTO> = (note) => {
    setMode('view');
    if (note.content !== props.note.content) {
      updateNote({
        id: props.note.id,
        content: note.content
      });
    }
  };

  return (
    <HistoryCard icon="ri-message-line">
      <Stack
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
          <Typography>
            <Typography sx={{ fontWeight: 700 }} component="span">
              {formatAuthor(props.note.creator, props.establishment)}
            </Typography>
            <Typography component="span">
              &nbsp;le {date} à {time}
            </Typography>
          </Typography>

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
                    onClick: form.handleSubmit(save)
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
