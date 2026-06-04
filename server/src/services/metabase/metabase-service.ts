import type { DashboardCard, Tab } from '@zerologementvacant/models';

export type DashboardData =
  | { tabs: ReadonlyArray<Tab> }
  | { cards: ReadonlyArray<DashboardCard> };

export interface DashboardParameter {
  id: string;
  slug: string;
  type: string;
}

export interface DashcardRef {
  dashcardId: number;
  cardId: number;
  type: 'flat-number' | 'percentage';
  valueColumn: string | null;
  dashboardParameters: ReadonlyArray<DashboardParameter>;
}

export interface MetabaseService {
  getDashboard(id: number): Promise<DashboardData>;
  findDashcard(dashboardId: number, dashcardId: number): Promise<DashcardRef | null>;
  getCardValue(
    dashboardId: number,
    dashcardId: number,
    cardId: number,
    parameters: ReadonlyArray<DashboardParameter & { value: string }>,
    valueColumn: string | null
  ): Promise<number>;
}
