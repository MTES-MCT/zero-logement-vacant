import { array, object, ObjectSchema, string } from 'yup';

import {
  DraftCreationPayloadDTO,
  SenderPayloadDTO,
  SignatoryDTO
} from '@zerologementvacant/models';
import { dateString } from './date-string';
import { fileUpload } from './file-upload';

export const signatory: ObjectSchema<SignatoryDTO> = object({
  firstName: string().nullable().defined(),
  lastName: string().nullable().defined(),
  role: string().nullable().defined(),
  file: fileUpload.nullable().defined()
});

// @ts-expect-error: expects 2 signatories, but it cannot be the case when
// defining the schema.
export const sender: ObjectSchema<SenderPayloadDTO> = object({
  name: string().nullable().defined(),
  service: string().nullable().defined(),
  firstName: string().nullable().defined(),
  lastName: string().nullable().defined(),
  address: string().nullable().defined(),
  email: string().nullable().defined(),
  phone: string().nullable().defined(),
  signatories: array()
    .of(signatory.nullable().defined())
    .length(2)
    .nullable()
    .defined()
});

export const draft: ObjectSchema<DraftCreationPayloadDTO> = object({
  campaign: string().defined().uuid(),
  subject: string().nullable().defined(),
  body: string().nullable().defined(),
  logo: array().of(fileUpload).nullable().defined(),
  sender: sender.nullable().defined(),
  writtenAt: dateString.nullable().defined(),
  writtenFrom: string().nullable().defined()
});
