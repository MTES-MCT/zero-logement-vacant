import { render, screen } from '@testing-library/react';
import { UserRole } from '@zerologementvacant/models';
import {
  genDocumentDTO,
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { describe, expect, it } from 'vitest';

import DocumentFullscreenPreview from '../DocumentFullscreenPreview';

describe('DocumentFullscreenPreview', () => {
  it('exposes an accessible dialog name based on the current document', () => {
    const establishment = genEstablishmentDTO();
    const author = genUserDTO(UserRole.USUAL, establishment);
    const document = genDocumentDTO(author, establishment);

    render(
      <DocumentFullscreenPreview
        documents={[document]}
        index={0}
        open
        onClose={() => {}}
        onIndexChange={() => {}}
      />
    );

    const dialog = screen.getByRole('dialog', {
      name: (accessibleName) => accessibleName.includes(document.filename)
    });
    expect(dialog).toBeInTheDocument();
  });
});
