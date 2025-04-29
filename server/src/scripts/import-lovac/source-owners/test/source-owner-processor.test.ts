import { toArray } from '@zerologementvacant/utils/node';
import { ReadableStream } from 'node:stream/web';
import { OwnerApi } from '~/models/OwnerApi';
import { formatOwnerApi } from '~/repositories/ownerRepository';
import { genSourceOwner } from '~/scripts/import-lovac/infra/fixtures';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import {
  mapEntity,
  SourceOwner
} from '~/scripts/import-lovac/source-owners/source-owner';
import sourceOwnerProcessor, {
  OwnerChange
} from '~/scripts/import-lovac/source-owners/source-owner-processor';
import { genOwnerApi } from '~/test/testFixtures';

describe('SourceOwnerProcessor', () => {
  describe('If the owner does not exist yet', () => {
    it('should create one', async () => {
      const sourceOwner = genSourceOwner();
      const input = new ReadableStream<SourceOwner>({
        pull(controller) {
          controller.enqueue(sourceOwner);
          controller.close();
        }
      });

      const actual = await toArray(
        input.pipeThrough(
          sourceOwnerProcessor({
            reporter: createNoopReporter(),
            abortEarly: true,
            ownerRepository: {
              findOne: jest.fn().mockResolvedValue(null)
            }
          })
        )
      );

      expect(actual).toHaveLength(1);
      expect(actual[0]).toStrictEqual<OwnerChange>({
        type: 'owner',
        kind: 'create',
        value: {
          id: expect.any(String),
          idpersonne: sourceOwner.idpersonne,
          fullName: sourceOwner.full_name,
          birthDate: sourceOwner.birth_date?.toJSON() ?? null,
          administrator: undefined,
          siren: sourceOwner.siren ?? undefined,
          rawAddress: sourceOwner.dgfip_address
            ? [sourceOwner.dgfip_address]
            : null,
          additionalAddress: undefined,
          email: undefined,
          phone: undefined,
          dataSource: 'lovac-2025',
          kind: sourceOwner.ownership_type,
          kindDetail: undefined,
          entity: mapEntity(sourceOwner.entity),
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      });
    });
  });

  describe('If the owner exists', () => {
    it('should update some of its properties', async () => {
      const sourceOwner = genSourceOwner();
      const input = new ReadableStream<SourceOwner>({
        pull(controller) {
          controller.enqueue(sourceOwner);
          controller.close();
        }
      });
      const existingOwner: OwnerApi = {
        ...genOwnerApi(),
        idpersonne: sourceOwner.idpersonne
      };

      const actual = await toArray(
        input.pipeThrough(
          sourceOwnerProcessor({
            reporter: createNoopReporter(),
            abortEarly: true,
            ownerRepository: {
              async findOne() {
                return formatOwnerApi(existingOwner);
              }
            }
          })
        )
      );

      expect(actual).toHaveLength(1);
      expect(actual[0]).toStrictEqual<OwnerChange>({
        type: 'owner',
        kind: 'update',
        value: {
          id: existingOwner.id,
          idpersonne: sourceOwner.idpersonne,
          fullName: sourceOwner.full_name ?? existingOwner.fullName,
          birthDate: sourceOwner.birth_date
            ? sourceOwner.birth_date.toJSON().substring(0, 'yyyy-mm-dd'.length)
            : existingOwner.birthDate
              ? new Date(existingOwner.birthDate).toJSON()
              : null,
          administrator: existingOwner.administrator ?? undefined,
          siren: existingOwner.siren ?? sourceOwner.siren ?? undefined,
          rawAddress: sourceOwner.dgfip_address
            ? [sourceOwner.dgfip_address]
            : null,
          additionalAddress: existingOwner.additionalAddress,
          email: existingOwner.email,
          phone: existingOwner.phone,
          dataSource: existingOwner.dataSource,
          kind: sourceOwner.ownership_type,
          kindDetail: existingOwner.kindDetail,
          entity: mapEntity(sourceOwner.entity),
          createdAt: existingOwner.createdAt,
          updatedAt: expect.any(String)
        }
      });
    });
  });

  describe('If something bad happens and `abortEarly` is true', () => {
    it('should throw an error', async () => {
      const sourceOwner = genSourceOwner();
      const input = new ReadableStream<SourceOwner>({
        pull(controller) {
          controller.enqueue(sourceOwner);
          controller.close();
        }
      });

      const doCollect = async () =>
        toArray(
          input.pipeThrough(
            sourceOwnerProcessor({
              reporter: createNoopReporter(),
              abortEarly: true,
              ownerRepository: {
                findOne: jest.fn().mockRejectedValue(new Error('Fail'))
              }
            })
          )
        );

      await expect(doCollect()).toReject();
    });
  });
});
