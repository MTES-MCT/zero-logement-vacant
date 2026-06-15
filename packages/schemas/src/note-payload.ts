import { NotePayloadDTO } from '@zerologementvacant/models';
import { object, ObjectSchema, string } from 'yup';

export const notePayload: ObjectSchema<NotePayloadDTO> = object({
  content: string().required('Veuillez renseigner le contenu de la note')
});
