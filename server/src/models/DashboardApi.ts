import UnprocessableEntityError from '~/errors/unprocessableEntityError';

export function getResource(id: string): number {
  const nb = Number(id.split('-').at(0));
  if (Number.isNaN(nb)) {
    throw new UnprocessableEntityError();
  }

  return nb;
}
