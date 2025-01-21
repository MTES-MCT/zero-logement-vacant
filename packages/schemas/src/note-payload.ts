import { object, ObjectSchema, string } from 'yup';

import { NotePayloadDTO } from '@zerologementvacant/models';

export const notePayload: ObjectSchema<NotePayloadDTO> = object({
  content: string().required('Veuillez renseigner le contenu de la note')
});
