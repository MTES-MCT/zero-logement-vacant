import config from '../utils/config';
import authService from './auth.service';
import { Housing, HousingDetails, HousingFilters } from '../models/Housing';


const listHousing = async (filters?: HousingFilters, search?: string) => {

    return await fetch(`${config.apiEndpoint}/api/housing`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, search }),
    })
        .then(response => {
            return response.json();
        })
        .then(_ => _.map((d: any) => ({
            id: d.id,
            address: d.fields['Adresse'],
            municipality: d.fields['Nom de la commune du logement'],
            ownerFullName: d.fields['Propriétaire'],
            ownerId: d.fields['ID propriétaire'],
            tags: [d.fields['Age (pour filtre)'] ?? 0 > 75 ? '> 75 ans' : ''].filter(_ => _.length)
        } as Housing)))
};

const listByOwner = async (ownerId: string) => {

    return await fetch(`${config.apiEndpoint}/api/housing/owner/${ownerId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(response => {
            return response.json();
        })
        .then(_ => _.map((d: any) => ({
            id: d.id,
            address: d.fields['Adresse'],
            municipality: d.fields['Nom de la commune du logement'],
            kind: d.fields['Type de logement'].trimRight() === 'MAISON' ? 'Maison' : d.fields['Type de logement'].trimRight() === 'APPART' ? 'Appartement' : undefined,
            surface: d.fields['Surface habitable'],
            rooms: d.fields['Nombre de pièces'],
            buildingYear: d.fields['Année de construction'],
            vacancyStart: d.fields['Début de la vacance'],
        } as HousingDetails)))
};

const housingService = {
    listHousing,
    listByOwner
};

export default housingService;
