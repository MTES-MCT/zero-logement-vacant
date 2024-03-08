import { DraftDTO } from '../../../shared/models/DraftDTO';

export interface Draft extends Omit<DraftDTO, 'body'> {
  body?: string;
}
