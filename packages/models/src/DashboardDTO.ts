// packages/models/src/DashboardDTO.ts

export type CardType = 'flat-number' | 'percentage';

export interface CardCommon {
  id: number;
  type: CardType;
  title: string;
  description: string | null;
  decimals: number;
  position: { col: number; row: number };
  size: { width: number; height: number };
}

export interface FlatNumberCard extends CardCommon {
  type: 'flat-number';
}

export interface PercentageCard extends CardCommon {
  type: 'percentage';
}

export type DashboardCard = FlatNumberCard | PercentageCard;

export interface Tab {
  id: number;
  title: string;
  cards: ReadonlyArray<DashboardCard>;
}

interface WithTabs {
  tabs: ReadonlyArray<Tab>;
}

interface WithoutTabs {
  cards: ReadonlyArray<DashboardCard>;
}

export type DashboardDTO = { id: number; url: string } & (WithTabs | WithoutTabs);

export interface CardDataDTO {
  id: number;
  data: number;
}

export const RESOURCE_VALUES = [
  '6-utilisateurs-de-zlv-sur-votre-structure',
  '7-autres-structures-de-votre-territoires-inscrites-sur-zlv',
  '13-analyses',
  '15-analyses-activites'
] as const;

export type Resource = (typeof RESOURCE_VALUES)[number];
