import { DraftData } from '../draft';
import { extractText } from 'unpdf';

import pdf from '../pdf';

describe('PDF', () => {
  const transformer = pdf.createTransformer({ logger: console });

  function compile(data: DraftData): Promise<Buffer> {
    return transformer.generatePDF(data);
  }

  describe('compile', () => {
    it('should display the owner', async () => {
      const pdfBuffer = await compile({
      subject: '',
      body: 'test',
      logo: [],
      sender: null,
      writtenFrom: null,
      writtenAt: null,
      owner: {
        fullName: 'Jean Dujardin',
        address: ['123 rue Bidon', '75001 Paris']
      }
      });

      const { text } = await extractText(new Uint8Array(pdfBuffer), { mergePages: true });

      expect(text).toContain('Jean Dujardin');
      expect(text).toContain('123 rue Bidon');
      expect(text).toContain('75001 Paris');
    }, 10000);

    it('should display a subject and body', async () => {
      const pdfBuffer = await compile({
        subject: 'Votre logement vacant',
        body: 'On vous aide à sortir votre logement de la vacance !',
        logo: [],
        sender: null,
        writtenFrom: null,
        writtenAt: null,
        owner: {
          fullName: 'Jean Dujardin',
          address: ['123 rue Bidon', '75001 Paris']
        }
      });

      const { text } = await extractText(new Uint8Array(pdfBuffer), { mergePages: true });

      expect(text).toContain('Votre logement vacant');
      expect(text).toContain('On vous aide à sortir votre logement de la vacance !');
    });

    it('should display two logos', async () => {
      const pdfBuffer = await compile({
        subject: null,
        body: 'test',
        logo: [
          {
            id: 'uuid1',
            content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==' // Base64 encoded 1x1 pixel PNG
          },
          {
            id: 'uuid2',
            content: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==' // Base64 encoded 1x1 pixel JPEG
          }
        ],
        sender: null,
        writtenFrom: null,
        writtenAt: null,
        owner: {
          fullName: 'Jean Dujardin',
          address: ['123 rue Bidon', '75001 Paris']
        }
      });

      // Simplified test: verify that the PDF contains two "image" objects
      const text = pdfBuffer.toString('latin1');
      const imagesFound = (text.match(/\/Subtype\s*\/Image/g) || []).length;
      expect(imagesFound).toBeGreaterThanOrEqual(2);
    });

    it('should display a sender', async () => {
      const pdfBuffer = await compile({
        subject: null,
        body: 'test',
        logo: [],
        sender: {
          name: 'Commune de Marseille',
          service: 'Logement',
          firstName: 'Marseille',
          lastName: 'BB',
          address: '13 La Canebière',
          email: 'jean.dujardin@marseille.fr',
          phone: '0123456789',
          signatories: null
        },
        writtenFrom: null,
        writtenAt: null,
        owner: {
          fullName: 'Jean Dujardin',
          address: ['123 rue Bidon', '75001 Paris']
        }
      });

      const { text } = await extractText(new Uint8Array(pdfBuffer), { mergePages: true });

      expect(text).toContain('Commune de Marseille');
      expect(text).toContain('Logement');
      expect(text).toContain('Marseille BB');
      expect(text).toContain('13 La Canebière');
      expect(text).toContain('jean.dujardin@marseille.fr');
      expect(text).toContain('0123456789');
    });

    it('should display two signatories', async () => {
      const signatories = [
        {
          firstName: 'Jean',
          lastName: 'Dujardin',
          role: 'Maire',
          file: {
            id: 'uuid1',
            content: 'data:image/png'
          }
        },
        {
          firstName: 'Marc',
          lastName: 'Dujardin',
          role: 'Adjoint',
          file: {
            id: 'uuid2',
            content: 'data:image/png'
          }
        }
      ];

      const pdfBuffer = await compile({
        subject: null,
        body: 'test',
        logo: [],
        sender: {
          name: 'Commune de Marseille',
          service: 'Logement',
          firstName: 'Marseille',
          lastName: 'BB',
          address: '123 rue Bidon',
          email: 'jean.dujardin@marseille.fr',
          phone: '0123456789',
          signatories
        },
        writtenFrom: null,
        writtenAt: null,
        owner: {
          fullName: 'Andrew Murray',
          address: ['123 rue Bidon', '75001 Paris']
        }
      });

      const { text } = await extractText(new Uint8Array(pdfBuffer), { mergePages: true });

      // Verify that the name and role of each signatory appear
      for (const signatory of signatories) {
        const fullName = `${signatory.firstName} ${signatory.lastName}`;
        expect(text).toContain(fullName);
        expect(text).toContain(signatory.role);
      }

      // Verify that there are at least 2 images (signatures)
      const rawPdf = pdfBuffer.toString('latin1');
      const imageCount = (rawPdf.match(/\/Subtype\s*\/Image/g) || []).length;
      expect(imageCount).toBeGreaterThanOrEqual(signatories.length);
    });
  });
});
