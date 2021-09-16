import config from '../utils/config';


const listHousing = async () => {

    return await fetch(`${config.apiEndpoint}/api/housing`)
        .then((response) => {
            return response.json();
        })
        .catch((error) => console.error(error));
};

const housingService = {
    listHousing
};

export default housingService;
