export interface DashboardApi {
  url: string;
}

export type Resource = '6-utilisateurs-de-zlv-sur-votre-structure' | '7-autres-structures-de-votre-territoires-inscrites-sur-zlv';

export function getResource(id: Resource): number {
  switch (id) {
    case '6-utilisateurs-de-zlv-sur-votre-structure':
      return 27;
    case '7-autres-structures-de-votre-territoires-inscrites-sur-zlv':
      return 33;
  }
}

interface CreateURLOptions {
  domain: string;
  token: string;
}

export function createURL(opts: CreateURLOptions): string {
  return `${opts.domain}/embed/dashboard/${opts.token}#bordered=true&titled=true`;
}
