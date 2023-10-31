export interface DashboardApi {
  url: string;
}

export type Resource = 'utilisateurs';

export function getResource(id: Resource): number {
  switch (id) {
    case 'utilisateurs':
      return 27;
  }
}

interface CreateURLOptions {
  domain: string;
  token: string;
}

export function createURL(opts: CreateURLOptions): string {
  return `${opts.domain}/embed/dashboard/${opts.token}#bordered=true&titled=true`;
}
