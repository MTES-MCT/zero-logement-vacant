import Stack from '@mui/material/Stack';
import { skipToken } from '@reduxjs/toolkit/query';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import NoteCard from '~/components/EventsHistory/NoteCard';
import type { Housing } from '~/models/Housing';
import { useFindNotesByHousingQuery } from '~/services/note.service';

interface Props {
  housingId: Housing['id'] | null;
}

interface NoteSchema {
  note: string | null;
}

function HousingEditionNoteTab(props: Props) {
  const { data: notes = [] } = useFindNotesByHousingQuery(
    props.housingId ?? skipToken
  );

  return (
    <Stack rowGap={2}>
      <AppTextInputNext<NoteSchema, string | null>
        label="Nouvelle note"
        name="note"
        nativeTextAreaProps={{ rows: 8 }}
        textArea
        mapValue={(value: string | null) => value ?? ''}
        contramapValue={(value) => (value === '' ? null : value)}
      />

      {notes.length > 0 && (
        <Stack spacing="1rem">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              establishment={null}
              hideIcon
              readOnly
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export default HousingEditionNoteTab;
