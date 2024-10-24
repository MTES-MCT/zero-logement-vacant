import { object, ObjectSchema, string } from 'yup';

import { FileUploadDTO } from '@zerologementvacant/models';

export const fileUpload: ObjectSchema<FileUploadDTO> = object({
  id: string().defined(),
  type: string().defined(),
  url: string().defined(),
  content: string().defined()
});
