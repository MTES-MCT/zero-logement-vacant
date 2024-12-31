import { Resource } from '@zerologementvacant/models';

// No need for DashboardApi

export function getResource(id: Resource): number {
  switch (id) {
    case '6-utilisateurs-de-zlv-sur-votre-structure':
      return 6;
    case '7-autres-structures-de-votre-territoires-inscrites-sur-zlv':
      return 7;
    case '13-analyses':
      return 13;
  }
}

interface CreateURLOptions {
  domain: string;
  token: string;
}

export function createURL(opts: CreateURLOptions): string {
  return `${opts.domain}/embed/dashboard/${opts.token}#bordered=true&titled=false`;
}
