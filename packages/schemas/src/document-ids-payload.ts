import { DocumentDTO } from '@zerologementvacant/models';
import { array, object, type ObjectSchema, string } from 'yup';

interface DocumentIdsPayload {
  documentIds: Array<DocumentDTO['id']>;
}

export function documentIdsPayload(): ObjectSchema<DocumentIdsPayload> {
  return object({
    documentIds: array().of(string().uuid().required()).min(1).required()
  });
}
