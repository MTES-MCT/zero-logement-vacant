import { Document, PDFViewer } from '@react-pdf/renderer';
import {
  genDocumentDTO,
  genDraftDTO,
  genEstablishmentDTO,
  genHousingDTO,
  genOwnerDTO,
  genSenderDTO,
  genSignatoryDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { useState } from 'react';

import { CampaignTemplate } from '~/templates/Campaign.js';

type TemplateName = 'campaign';

export function Previewer() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateName>('campaign');

  // Generate sample data
  const creator = genUserDTO();
  const establishment = genEstablishmentDTO();
  const housing = genHousingDTO();
  const owner = genOwnerDTO();
  const sender = genSenderDTO();
  const draft = genDraftDTO(sender);
  draft.logoNext = [
    {
      ...genDocumentDTO(creator, establishment),
      url: '/logo-1.jpg'
    },
    {
      ...genDocumentDTO(creator, establishment),
      url: '/logo-2.png'
    }
  ];
  draft.sender = {
    ...draft.sender,
    signatories: [
      {
        ...genSignatoryDTO(),
        document: {
          ...genDocumentDTO(creator, establishment),
          url: '/logo-1.jpg'
        }
      },
      {
        ...genSignatoryDTO(),
        document: {
          ...genDocumentDTO(creator, establishment),
          url: '/logo-2.png'
        }
      }
    ]
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Template selector */}
      <nav
        style={{
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
          PDF Template Previewer
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setSelectedTemplate('campaign')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor:
                selectedTemplate === 'campaign' ? '#0066cc' : '#fff',
              color: selectedTemplate === 'campaign' ? '#fff' : '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: selectedTemplate === 'campaign' ? 'bold' : 'normal'
            }}
          >
            Campaign Template
          </button>
        </div>
      </nav>

      {/* PDF Viewer */}
      <PDFViewer style={{ flex: 1, border: 'none' }}>
        <Document>
          {selectedTemplate === 'campaign' && (
            <CampaignTemplate draft={draft} housing={housing} owner={owner} />
          )}
        </Document>
      </PDFViewer>
    </div>
  );
}
