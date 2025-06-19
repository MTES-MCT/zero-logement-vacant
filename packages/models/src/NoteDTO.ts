import { UserDTO } from './UserDTO';

export interface NoteDTO {
  id: string;
  content: string;
  noteKind: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
  creator: UserDTO;
}

export type NotePayloadDTO = Pick<NoteDTO, 'content'>;
