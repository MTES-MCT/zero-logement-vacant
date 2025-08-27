import { fc, test } from '@fast-check/vitest';
import {
  DraftUpdatePayload,
  FileUploadDTO,
  SignatoryDTO
} from '@zerologementvacant/models';

import { draftUpdatePayload } from '../draft';

describe('Draft schema', () => {
  describe('draftUpdatePayload', () => {
    const fileUpload = () =>
      fc.record<FileUploadDTO>({
        id: fc.stringMatching(/\S+/),
        type: fc.stringMatching(/\S+/),
        url: fc.webUrl(),
        content: fc.stringMatching(/^data:.*;base64,.+/)
      });

    const signatory = () =>
      fc.record<SignatoryDTO>({
        firstName: fc.option(fc.stringMatching(/\S+/)),
        lastName: fc.option(fc.stringMatching(/\S+/)),
        role: fc.option(fc.stringMatching(/\S+/)),
        file: fc.option(fileUpload())
      });

    test.prop<DraftUpdatePayload>({
      subject: fc.option(fc.stringMatching(/\S+/)),
      body: fc.option(fc.stringMatching(/\S+/)),
      logo: fc.option(fc.array(fileUpload(), { minLength: 1, maxLength: 2 })),
      sender: fc.record({
        name: fc.option(fc.stringMatching(/\S+/)),
        service: fc.option(fc.stringMatching(/\S+/)),
        firstName: fc.option(fc.stringMatching(/\S+/)),
        lastName: fc.option(fc.stringMatching(/\S+/)),
        address: fc.option(fc.stringMatching(/\S+/)),
        email: fc.option(fc.emailAddress()),
        phone: fc.option(fc.stringMatching(/^\d{10}$/)),
        signatories: fc.option(fc.tuple(signatory(), signatory()))
      }),
      writtenAt: fc.option(
        fc
          .date({ noInvalidDate: true })
          .map((date) => date.toJSON().substring(0, 'yyyy-mm-dd'.length))
      ),
      writtenFrom: fc.option(fc.stringMatching(/\S+/))
    })('should validate inputs', (data) => {
      const validate = () => draftUpdatePayload.validateSync(data);

      expect(validate).not.toThrow();
    });
  });
});
