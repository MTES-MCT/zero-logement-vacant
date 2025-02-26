import { screen } from '@testing-library/dom';
import { DRAFT_TEMPLATE_FILE, DraftData } from '../draft';

import pdf from '../pdf';

describe('PDF', () => {
  const transformer = pdf.createTransformer({ logger: console });

  function compile(data: DraftData): string {
    return transformer.compile(DRAFT_TEMPLATE_FILE, data);
  }

  describe('compile', () => {
    it('should display the owner', () => {
      document.body.innerHTML = compile({
        subject: null,
        body: null,
        logo: null,
        sender: null,
        writtenFrom: null,
        writtenAt: null,
        owner: {
          fullName: 'Jean Dujardin',
          address: ['123 rue Bidon', '75001 Paris']
        }
      });

      const owner = screen.getByText('Jean Dujardin');
      const address = screen.getByText('123 rue Bidon');
      const city = screen.getByText('75001 Paris');
      expect(owner).toBeInTheDocument();
      expect(address).toBeInTheDocument();
      expect(city).toBeInTheDocument();
    });

    it('should display a subject and body', () => {
      document.body.innerHTML = compile({
        subject: 'Votre logement vacant',
        body: 'On vous aide à sortir votre logement de la vacance !',
        logo: null,
        sender: null,
        writtenFrom: null,
        writtenAt: null,
        owner: {
          fullName: 'Jean Dujardin',
          address: ['123 rue Bidon', '75001 Paris']
        }
      });

      const subject = screen.getByText('Votre logement vacant');
      const body = screen.getByText(
        'On vous aide à sortir votre logement de la vacance !'
      );
      expect(subject).toBeInTheDocument();
      expect(body).toBeInTheDocument();
    });

    it('should display two logos', () => {
      document.body.innerHTML = compile({
        subject: null,
        body: null,
        logo: [
          {
            id: 'uuid1',
            content: 'data:image/png'
          },
          {
            id: 'uuid2',
            content: 'data:image/jpg'
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

      const logos = screen.getAllByRole('img');
      logos.forEach((logo) => {
        expect(logo).toBeInTheDocument();
      });
    });

    it('should display a sender', () => {
      document.body.innerHTML = compile({
        subject: null,
        body: null,
        logo: null,
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

      const name = screen.getByText('Commune de Marseille');
      const service = screen.getByText('Logement');
      const fullName = screen.getByText('Marseille BB');
      const address = screen.getByText('13 La Canebière');
      const email = screen.getByText('jean.dujardin@marseille.fr');
      const phone = screen.getByText('0123456789');
      expect(name).toBeInTheDocument();
      expect(service).toBeInTheDocument();
      expect(fullName).toBeInTheDocument();
      expect(address).toBeInTheDocument();
      expect(email).toBeInTheDocument();
      expect(phone).toBeInTheDocument();
    });

    it('should display two signatories', () => {
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

      document.body.innerHTML = compile({
        subject: null,
        body: null,
        logo: null,
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

      signatories.forEach((signatory) => {
        const fullName = screen.getByText(
          `${signatory.firstName} ${signatory.lastName}`
        );
        const role = screen.getByText(signatory.role);
        expect(fullName).toBeInTheDocument();
        expect(role).toBeInTheDocument();
      });
      const signatures = screen.getAllByAltText('Signature');
      expect(signatures).toHaveLength(signatories.length);
    });
  });
});
