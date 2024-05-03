import { OwnerApi } from '~/models/OwnerApi';

export interface OwnerDuplicate extends OwnerApi {
  /**
   * The source owner that was compared with this duplicate.
   */
  sourceId: string;
}
