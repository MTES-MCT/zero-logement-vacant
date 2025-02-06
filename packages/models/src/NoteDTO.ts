import { UserDTO } from './UserDTO';

export interface NoteDTO {
  id: string;
  content: string;
  noteKind: string;
  createdBy: string;
  createdAt: string;
  creator?: UserDTO;
}

export type NotePayloadDTO = Pick<NoteDTO, 'content'>;
