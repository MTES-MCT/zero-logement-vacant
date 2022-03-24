import { Owner } from './Owner';
import { Address } from './Address';
import { HousingStatus } from './HousingState';

export interface Housing {
    id: string;
    invariant: string;
    cadastralReference: string,
    buildingLocation?: string,
    rawAddress: string[];
    address: Address;
    latitude?: number;
    longitude?: number;
    owner: Owner;
    livingArea: number;
    housingKind: string;
    roomsCount: number;
    buildingYear?: number;
    vacancyStartYear: number;
    vacancyReasons: string[];
    dataYears: number[];
    campaignIds: string[];
    status?: HousingStatus;
    subStatus?: string;
    precision?: string;
}

export interface SelectedHousing {
    all: boolean;
    ids: string[];
}

export interface HousingUpdate {
    status: HousingStatus,
    subStatus?: string,
    precision?: string,
    contactKind?: string,
    vacancyReasons?: string[],
    comment?: string
}

export interface BuildingLocation {
    building: string,
    entrance: string,
    level: string,
    local: string
}

export const getBuildingLocation = (housing: Housing) => {
    const idx = housing.buildingLocation?.length === 11 ? 1 : housing.buildingLocation?.length === 10 ? 0 : undefined
    if (idx !== undefined && housing.buildingLocation &&  housing.buildingLocation !== 'A010001001') {
        const level = housing.buildingLocation.substr(1 + idx, 2);
        return {
            building: 'Bâtiment ' + housing.buildingLocation.substr(0, 1 + idx),
            entrance: 'Entrée ' + housing.buildingLocation.substr(1 + idx, 2).replace(/^0+/g, ''),
            level:
                level === '00' ? 'Rez-de-chaussée' :
                level === '01' ? '1er étage' :
                level.replace(/^0+/g, '') + 'ème étage',
            local: 'Local ' + housing.buildingLocation.substr(5 + idx, 5).replace(/^0+/g, '')
        } as BuildingLocation
    }
}

export const selectedHousingCount = (selectedHousing: SelectedHousing, totalCount: number) => {
    return selectedHousing.all ? totalCount - selectedHousing.ids.length : selectedHousing.ids.length
}

export const HousingSort = (h1: Housing, h2: Housing) =>
    Math.max(...h1.dataYears) === Math.max(...h2.dataYears) ?
        h1.invariant.localeCompare(h2.invariant) :
        Math.max(...h1.dataYears) - Math.max(...h2.dataYears);
