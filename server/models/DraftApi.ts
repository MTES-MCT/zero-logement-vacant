import { DraftDTO } from '../../shared/models/DraftDTO';

export interface DraftApi extends DraftDTO {
  establishmentId: string;
}
