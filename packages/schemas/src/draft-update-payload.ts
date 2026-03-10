import { draftCreationPayload } from './draft-creation-payload';

export const draftUpdatePayload = draftCreationPayload.omit(['campaign'])
