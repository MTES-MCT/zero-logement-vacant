import { object, string, tuple } from 'yup';

import { dateString } from './date-string';

export const signatory = object({
  firstName: string().optional().nullable().default(null),
  lastName: string().optional().nullable().default(null),
  role: string().optional().nullable().default(null),
  document: string().uuid().optional().nullable().default(null)
});

const NULL_SIGNATORIES: [null, null] = [null, null];

export const sender = object({
  name: string().optional().nullable().default(null),
  service: string().optional().nullable().default(null),
  firstName: string().optional().nullable().default(null),
  lastName: string().optional().nullable().default(null),
  address: string().optional().nullable().default(null),
  email: string().optional().nullable().default(null),
  phone: string().optional().nullable().default(null),
  signatories: tuple([
    signatory.optional().nullable().default(null),
    signatory.optional().nullable().default(null)
  ])
    .optional()
    .nullable()
    .transform((value) => value ?? NULL_SIGNATORIES)
    .default(NULL_SIGNATORIES)
});

export const draftCreationPayload = object({
  campaign: string().uuid().required(),
  subject: string().optional().nullable().default(null),
  body: string().optional().nullable().default(null),
  logo: tuple([
    string().uuid().optional().nullable().default(null),
    string().uuid().optional().nullable().default(null)
  ])
    .optional()
    .nullable()
    .transform((value) => value ?? [null, null])
    .default([null, null]),
  sender: sender.optional().nullable().default(null),
  writtenAt: dateString.optional().nullable().default(null),
  writtenFrom: string().optional().nullable().default(null)
});
