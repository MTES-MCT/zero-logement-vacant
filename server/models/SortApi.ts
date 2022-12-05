type Direction = 'asc' | 'desc'
export type Sort<Sortable extends object = object> = Partial<Record<keyof Sortable, Direction>>

/**
 * Parse sort query string to an object.
 * The query format is assumed to be validated at route-level.
 * @param query
 *
 * @example
 * const sort = parse('owner,-rawAddress')
 * // { owner: 'asc', rawAddress: 'desc' }
 */
function parse<Sortable extends object = object>(query?: string): Sort<Sortable> | undefined {
  if (!query) {
    return
  }

  return query
    .split(',')
    .map(key => {
      if (key.startsWith('-')) {
        const keyWithoutMinus = key.slice(1) as keyof Sortable
        return { [keyWithoutMinus]: 'desc' } as Record<keyof Sortable, Direction>
      }
      return { [key]: 'asc' } as Record<keyof Sortable, Direction>
    })
    .reduce((sort, entry) => {
      return { ...sort, ...entry }
    }, {})
}

interface FormatOptions<Sortable> {
  keys?: Partial<Record<keyof Sortable, () => void>>
}

function use<Sortable extends object = object>(sort: Sort, options?: FormatOptions<Sortable>): void {
  return Object
    .keys(sort)
    .forEach(key => {
      options?.keys?.[key as keyof Sortable]?.()
    })
}

export default {
  parse,
  use
}
