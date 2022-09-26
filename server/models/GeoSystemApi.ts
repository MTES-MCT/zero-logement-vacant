export const GeoSystemIds = {
    WGS84: '4326'
} as const

export type GeoSystemId = typeof GeoSystemIds[keyof typeof GeoSystemIds]

export interface GeoSystemApi<T = GeoSystemId> {
    id: T,
    name: string,
    proj4Def: string // https://github.com/josueggh/proj4-list/blob/master/list.js
}

export const GeoSystems: { [key in GeoSystemId]: GeoSystemApi<key> } = {
    '4326': {
        id: '4326',
        name: 'WGS84',
        proj4Def: '+proj=longlat +datum=WGS84 +no_defs'
    }
}
