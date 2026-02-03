import { DocumentDTO } from '@zerologementvacant/models';
import { array, object, type ObjectSchema, string } from 'yup';

export interface HousingDocumentPayload {
  documentIds: Array<DocumentDTO['id']>;
}

export const housingDocumentPayload: ObjectSchema<HousingDocumentPayload> =
  object({
    documentIds: array().of(string().uuid().required()).min(1).required()
  });
