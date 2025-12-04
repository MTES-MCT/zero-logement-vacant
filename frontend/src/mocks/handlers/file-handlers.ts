import type { FileUploadDTO, HousingDTO } from '@zerologementvacant/models';
import { http, HttpResponse, type RequestHandler } from 'msw';
import config from '~/utils/config';
import data from './data';
import { constants } from 'node:http2';

interface PathParams extends Record<string, string> {
  id: HousingDTO['id'];
}

const listByHousing = http.get<
  PathParams,
  never,
  ReadonlyArray<FileUploadDTO> | Error
>(`${config.apiEndpoint}/api/housing/:id/files`, ({ params }) => {
  const housing = data.housings.find((housing) => housing.id === params.id);
  if (!housing) {
    return HttpResponse.json(
      {
        name: 'HousingMissingError',
        message: `Housing ${params.id} missing`
      },
      { status: constants.HTTP_STATUS_NOT_FOUND }
    );
  }

  const files = data.housingFiles.get(params.id) ?? [];
  return HttpResponse.json(files, {
    status: constants.HTTP_STATUS_OK
  });
});

export const fileHandlers: RequestHandler[] = [listByHousing];
