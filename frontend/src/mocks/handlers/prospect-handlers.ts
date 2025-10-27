import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import type { ProspectDTO } from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';

interface SignupLinkParams {
  id: string;
}

interface ProspectParams {
  email: string;
}

export const prospectHandlers: RequestHandler[] = [
  http.put<SignupLinkParams, never, ProspectDTO>(
    `${config.apiEndpoint}/api/signup-links/:id/prospect`,
    async ({ params }) => {
      const link = data.signupLinks.find((link) => link.id === params.id);
      if (!link) {
        throw new HttpResponse(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }
      if (link.expiresAt < new Date()) {
        throw new HttpResponse(null, {
          status: constants.HTTP_STATUS_GONE
        });
      }

      const existingProspect = data.prospects.find(
        (prospect) => prospect.email === link.prospectEmail
      );
      const prospect: ProspectDTO = {
        email: link.prospectEmail,
        establishment: existingProspect?.establishment,
        hasAccount: existingProspect?.hasAccount ?? false,
        hasCommitment: existingProspect?.hasCommitment ?? false
      };
      data.prospects = data.prospects.map((value) => {
        return value.email === prospect.email ? prospect : value;
      });
      return HttpResponse.json(prospect, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),
  http.get<ProspectParams, never, ProspectDTO>(
    `${config.apiEndpoint}/api/prospects/:email`,
    async ({ params }) => {
      const prospect = data.prospects.find(
        (prospect) => prospect.email === params.email
      );
      if (!prospect) {
        throw new HttpResponse(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      return HttpResponse.json(prospect, {
        status: constants.HTTP_STATUS_OK
      });
    }
  )
];
