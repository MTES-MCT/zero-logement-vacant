// packages/models/src/DashboardDTO.ts

export type CardType =
  | 'flat-number'
  | 'percentage'
  | 'pie-chart'
  | 'bar-chart'
  | 'table';

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

export interface PieChartCard extends CardCommon {
  type: 'pie-chart';
}

export interface BarChartCard extends CardCommon {
  type: 'bar-chart';
}

export interface TableCard extends CardCommon {
  type: 'table';
}

export type DashboardCard =
  | FlatNumberCard
  | PercentageCard
  | PieChartCard
  | BarChartCard
  | TableCard;

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

export interface ScalarCardDataDTO {
  id: number;
  type: 'flat-number' | 'percentage';
  data: number;
}

export interface PieChartDataDTO {
  id: number;
  type: 'pie-chart';
  data: number[];
  labels: string[];
}

export interface BarChartDataDTO {
  id: number;
  type: 'bar-chart';
  direction: 'horizontal' | 'vertical';
  labels: string[];
  data: number[];
}

export interface TableColumnMeta {
  name: string;
  displayName: string;
  baseType: 'number' | 'string' | 'date' | 'boolean' | 'unknown';
  decimals?: number;
  suffix?: string;
  numberStyle?: 'decimal' | 'percent' | 'currency' | 'scientific';
}

export interface TableDataDTO {
  id: number;
  type: 'table';
  columns: TableColumnMeta[];
  rows: unknown[][];
}

export type CardDataDTO =
  | ScalarCardDataDTO
  | PieChartDataDTO
  | BarChartDataDTO
  | TableDataDTO;

export const RESOURCE_VALUES = [
  '6-utilisateurs-de-zlv-sur-votre-structure',
  '7-autres-structures-de-votre-territoires-inscrites-sur-zlv',
  '13-analyses',
  '15-analyses-activites'
] as const;

export type Resource = (typeof RESOURCE_VALUES)[number];
