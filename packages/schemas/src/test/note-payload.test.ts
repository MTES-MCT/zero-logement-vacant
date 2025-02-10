import { fc, test } from '@fast-check/jest';

import { NotePayloadDTO } from '@zerologementvacant/models';
import { notePayload } from '../note-payload';

describe('Note payload', () => {
  test.prop<NotePayloadDTO>({
    content: fc.string({ minLength: 1 })
  })(`should validate inputs`, (payload) => {
    const validate = () => notePayload.validateSync(payload);

    expect(validate).not.toThrow();
  });
});
