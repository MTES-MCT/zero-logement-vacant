import config from '../utils/config';
import authService from './auth.service';
import { Housing, HousingFilters } from '../models/Housing';
import { HousingDetail, Owner } from '../models/HousingDetail';
import { parse } from 'date-fns'


const getHousing = async (id: string) => {

    return await fetch(`${config.apiEndpoint}/api/housing/${id}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(response => {
            return response.json();
        })
        .then((d: any) => ({
            id: d.id,
            address: [
                d.fields['ADRESSE1'],
                d.fields['ADRESSE2'],
                d.fields['ADRESSE3'],
                d.fields['ADRESSE4']
            ].filter(a => a !== undefined),
            owner: {
                fullName: d.fields['Propriétaire'],
                birthDate: parse(d.fields['Année naissance'], 'yyyy-MM-dd', new Date())
            } as Owner,
            tags: [d.fields['Age (pour filtre)'] ?? 0 > 75 ? '> 75 ans' : ''].filter(_ => _.length)
        } as HousingDetail))
};

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
            address: [
                d.fields['ADRESSE1'],
                d.fields['ADRESSE2'],
                d.fields['ADRESSE3'],
                d.fields['ADRESSE4']
            ].filter(a => a !== undefined),
            owner: d.fields['Propriétaire'],
            tags: [d.fields['Age (pour filtre)'] ?? 0 > 75 ? '> 75 ans' : ''].filter(_ => _.length)
        } as Housing)))
};

const housingService = {
    getHousing,
    listHousing
};

export default housingService;
