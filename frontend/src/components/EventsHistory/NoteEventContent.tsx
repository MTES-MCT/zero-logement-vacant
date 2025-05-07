import Typography from '@mui/material/Typography';
import { Note } from '../../models/Note';

interface NoteEventContentProps {
  note: Note;
}

const NoteEventContent = ({ note }: NoteEventContentProps) => {
  return (
    <Typography
      dangerouslySetInnerHTML={{
        __html: note.content.replaceAll(/(\n|\\n)/g, '<br />')
      }}
    />
  );
};

export default NoteEventContent;
