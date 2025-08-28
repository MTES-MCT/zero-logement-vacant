import { object, ObjectSchema, string, tuple } from 'yup';

import {
  SignatoryDTO,
  type DraftCreationPayload,
  type DraftUpdatePayload,
  type SenderPayload
} from '@zerologementvacant/models';
import { dateString } from './date-string';
import { fileUpload } from './file-upload';

export const signatory: ObjectSchema<SignatoryDTO> = object({
  firstName: string().trim().nullable().defined(),
  lastName: string().trim().nullable().defined(),
  role: string().trim().nullable().defined(),
  file: fileUpload.nullable().defined()
});

export const sender: ObjectSchema<SenderPayload> = object({
  name: string().nullable().defined(),
  service: string().nullable().defined(),
  firstName: string().nullable().defined(),
  lastName: string().nullable().defined(),
  address: string().nullable().defined(),
  email: string()
    .trim()
    .email('Veuillez renseigner un courriel valide')
    .defined()
    .nullable(),
  phone: string()
    .trim()
    .defined()
    .nullable()
    .matches(/^\d{10}$/, {
      message: 'Veuillez renseigner un numéro de téléphone valide',
      excludeEmptyString: true
    }),
  signatories: tuple([
    signatory.nullable().defined(),
    signatory.nullable().defined()
  ])
    .nullable()
    .defined()
});

export const draftUpdatePayload: ObjectSchema<DraftUpdatePayload> = object({
  subject: string().trim().nullable().defined(),
  body: string().nullable().defined(),
  logo: tuple([
    fileUpload.nullable().defined(),
    fileUpload.nullable().defined()
  ])
    .nullable()
    .defined(),
  sender: sender.defined(),
  writtenAt: dateString.nullable().defined(),
  writtenFrom: string().nullable().defined()
});

export const draftCreationPayload: ObjectSchema<DraftCreationPayload> =
  draftUpdatePayload.shape({
    campaign: string().uuid().defined()
  });
