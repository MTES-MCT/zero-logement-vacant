import type { DocumentDTO } from '@zerologementvacant/models';

import type { UserApi } from '~/models/UserApi';

export type DocumentApi = Omit<DocumentDTO, 'creator' | 'url'> & {
  s3Key: string;
  createdBy: UserApi['id'];
  creator: UserApi;
  deletedAt: string | null;
};
