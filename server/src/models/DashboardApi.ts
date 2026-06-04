import UnprocessableEntityError from '~/errors/unprocessableEntityError';

// ─── Slug → numeric ID ───────────────────────────────────────────────────────

export function getResource(id: string): number {
  switch (id) {
    case '6-utilisateurs-de-zlv-sur-votre-structure':
      return 6;
    case '7-autres-structures-de-votre-territoires-inscrites-sur-zlv':
      return 7;
    case '13-analyses':
      return 13;
    case '15-analyses-activites':
      return 15;
    default:
      throw new UnprocessableEntityError();
  }
}

// ─── Embed URL ───────────────────────────────────────────────────────────────

interface CreateURLOptions {
  domain: string;
  token: string;
}

export function createURL(opts: CreateURLOptions): string {
  return `${opts.domain}/embed/dashboard/${opts.token}#bordered=true&titled=false`;
}
