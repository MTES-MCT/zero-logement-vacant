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

interface OrderByClause {
  column: string
  order?: Direction
}

interface FormatOptions<Sortable> {
  mapKeys?: Partial<Record<keyof Sortable, string>>
}

function format<Sortable extends object = object>(sort: Sort, options?: FormatOptions<Sortable>): OrderByClause[] {
  return Object
    .entries<Direction>(sort)
    .map(([key, direction]) => {
      const mappedKey = options?.mapKeys?.[key as keyof Sortable] ?? key
      return [mappedKey, direction]
    })
    .map<OrderByClause>(([key, direction]) => {
      return {
        column: key,
        order: direction as Direction,
      }
    })
}

export default {
  parse,
  format,
}
