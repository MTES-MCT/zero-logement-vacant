import { PDFViewer } from '@react-pdf/renderer';
import createFactories, { MemoryAdapter } from '@zerologementvacant/factories';
import {
  genCampaignDTO,
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
import { match } from 'ts-pattern';

import {
  browserCanvasFactory,
  CampaignReportDocument,
  CampaignReportPage,
  CanvasProvider
} from '~/browser.js';
import { CampaignDocument, CampaignPage } from '~/templates/Campaign.js';

const TEMPLATE_NAMES = ['campaign', 'campaign-report'] as const;
type TemplateName = (typeof TEMPLATE_NAMES)[number];

const factories = createFactories(new MemoryAdapter());

export function Previewer() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateName>('campaign');

  // Generate sample data
  const creator = genUserDTO();
  const establishment = genEstablishmentDTO();
  const housing = genHousingDTO();
  const owner = genOwnerDTO();
  const sender = genSenderDTO();
  const campaign = genCampaignDTO();
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

  const housings = factories.housing.buildList(260);

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
          {TEMPLATE_NAMES.map((templateName) => (
            <button
              key={templateName}
              onClick={() => setSelectedTemplate(templateName)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor:
                  selectedTemplate === templateName ? '#0066cc' : '#fff',
                color: selectedTemplate === templateName ? '#fff' : '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight:
                  selectedTemplate === templateName ? 'bold' : 'normal'
              }}
            >
              {templateName.replace('-', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      {/* PDF Viewer */}
      <PDFViewer style={{ flex: 1, border: 'none' }}>
        {match(selectedTemplate)
          .with('campaign', () => (
            <CampaignDocument campaign={campaign}>
              {selectedTemplate === 'campaign' && (
                <CampaignPage draft={draft} housing={housing} owner={owner} />
              )}
            </CampaignDocument>
          ))
          .with('campaign-report', () => (
            <CanvasProvider factory={browserCanvasFactory}>
              <CampaignReportDocument>
                <CampaignReportPage housings={housings} />
              </CampaignReportDocument>
            </CanvasProvider>
          ))
          .exhaustive()}
      </PDFViewer>
    </div>
  );
}
