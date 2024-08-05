export interface SourceHousingOwner {
  local_id: string;
  idpersonne: string;
  idprocpte: string;
  idprodroit: string;
  locprop: number;
  rank: 1 | 2 | 3 | 4 | 5 | 6;
  ownership_type: string;
  ownership_score: number;
  ownership_score_reason: string;
}
