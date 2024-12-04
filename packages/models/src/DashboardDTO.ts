export interface DashboardDTO {
  url: string;
}

export const RESOURCE_VALUES = [
  '6-utilisateurs-de-zlv-sur-votre-structure',
  '7-autres-structures-de-votre-territoires-inscrites-sur-zlv',
  '13-analyses'
] as const;
export type Resource = (typeof RESOURCE_VALUES)[number];
