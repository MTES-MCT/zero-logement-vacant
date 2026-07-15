import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApplySummary, PlanSummary } from '../lib/types';

const mockLogger = vi.hoisted(() => ({
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}));

// Mock the underlying functions and the logger before importing the CLI
vi.mock('../lib/plan', () => ({
  plan: vi.fn()
}));
vi.mock('../lib/apply', () => ({
  apply: vi.fn()
}));
vi.mock('../lib/stats', () => ({
  stats: vi.fn()
}));
vi.mock('../index', () => ({
  repairs: {}
}));
vi.mock('~/infra/logger', () => ({
  createLogger: () => mockLogger,
  logger: mockLogger
}));

import { repairCommand } from '../cli';
import { apply } from '../lib/apply';
import { plan } from '../lib/plan';
import { stats } from '../lib/stats';

const mockPlan = vi.mocked(plan);
const mockApply = vi.mocked(apply);
const mockStats = vi.mocked(stats);

let outDir: string;

beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zlv-cli-test-'));
  vi.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

describe('repairCommand()', () => {
  describe('list', () => {
    it('logs "No repairs registered." when registry is empty', async () => {
      const cmd = repairCommand();
      await cmd.parseAsync(['list'], { from: 'user' });
      expect(mockLogger.info).toHaveBeenCalledWith('No repairs registered.');
    });

    it('logs repair names when registry has entries', async () => {
      const { repairs } = await import('../index');
      (repairs as Record<string, unknown>)['test-repair'] = {
        name: 'test-repair',
        query: async () => [],
        decide: () => ({ action: 'skip' as const })
      };

      const cmd = repairCommand();
      await cmd.parseAsync(['list'], { from: 'user' });
      expect(mockLogger.info).toHaveBeenCalledWith('test-repair');

      delete (repairs as Record<string, unknown>)['test-repair'];
    });
  });

  describe('plan', () => {
    it('calls plan() with the named repair and logs the summary', async () => {
      const { repairs } = await import('../index');
      (repairs as Record<string, unknown>)['my-repair'] = {
        name: 'my-repair',
        query: async () => [],
        decide: () => ({ action: 'skip' as const })
      };

      const summary: PlanSummary = {
        total: 10,
        planned: 8,
        skipped: 1,
        errors: 1,
        eventsToDelete: 3,
        eventsToCreate: 2
      };
      mockPlan.mockResolvedValue(summary);

      const cmd = repairCommand();
      await cmd.parseAsync(['plan', 'my-repair', '--out', outDir], {
        from: 'user'
      });

      expect(mockPlan).toHaveBeenCalledOnce();
      expect(mockPlan).toHaveBeenCalledWith(
        (repairs as Record<string, unknown>)['my-repair'],
        { outDir }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Plan generated'),
        expect.objectContaining({ total: 10, planned: 8, outDir })
      );

      delete (repairs as Record<string, unknown>)['my-repair'];
    });

    it('logs an error and exits when repair name is unknown', async () => {
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as never);

      const cmd = repairCommand();
      await cmd.parseAsync(['plan', 'nonexistent'], { from: 'user' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unknown repair: "nonexistent"')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });
  });

  describe('stats', () => {
    it('calls stats() with the plan file and logs the summary', async () => {
      const planFile = path.join(outDir, 'plan.jsonl');
      fs.writeFileSync(planFile, '');

      const summary: Pick<
        PlanSummary,
        'planned' | 'eventsToDelete' | 'eventsToCreate'
      > = {
        planned: 5,
        eventsToDelete: 2,
        eventsToCreate: 3
      };
      mockStats.mockResolvedValue(summary);

      const cmd = repairCommand();
      await cmd.parseAsync(['stats', planFile], { from: 'user' });

      expect(mockStats).toHaveBeenCalledWith(planFile);
      expect(mockLogger.info).toHaveBeenCalledWith('Plan stats', summary);
    });
  });

  describe('apply', () => {
    const summary: ApplySummary = {
      updated: 7,
      eventsDeleted: 4,
      eventsCreated: 2
    };

    async function registerRepair(bypassTriggers?: boolean): Promise<string> {
      const { repairs } = await import('../index');
      (repairs as Record<string, unknown>)['my-repair'] = {
        name: 'my-repair',
        bypassTriggers,
        query: async () => [],
        decide: () => ({ action: 'skip' as const })
      };
      return 'my-repair';
    }

    async function unregisterRepair(): Promise<void> {
      const { repairs } = await import('../index');
      delete (repairs as Record<string, unknown>)['my-repair'];
    }

    it('calls apply() with the plan file and logs the summary', async () => {
      const name = await registerRepair();
      const planFile = path.join(outDir, 'plan.jsonl');
      fs.writeFileSync(planFile, '');
      mockApply.mockResolvedValue(summary);

      const cmd = repairCommand();
      await cmd.parseAsync(['apply', name, planFile], { from: 'user' });

      expect(mockApply).toHaveBeenCalledWith(planFile, {
        bypassTriggers: false
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Plan applied',
        expect.objectContaining({ updated: 7, bypassTriggers: false })
      );
      await unregisterRepair();
    });

    it('defaults bypassTriggers to false when neither flag nor repair set it', async () => {
      const name = await registerRepair(undefined);
      const planFile = path.join(outDir, 'plan.jsonl');
      fs.writeFileSync(planFile, '');
      mockApply.mockResolvedValue(summary);

      const cmd = repairCommand();
      await cmd.parseAsync(['apply', name, planFile], { from: 'user' });

      expect(mockApply).toHaveBeenCalledWith(planFile, {
        bypassTriggers: false
      });
      await unregisterRepair();
    });

    it('uses repair.bypassTriggers when no flag is passed', async () => {
      const name = await registerRepair(true);
      const planFile = path.join(outDir, 'plan.jsonl');
      fs.writeFileSync(planFile, '');
      mockApply.mockResolvedValue(summary);

      const cmd = repairCommand();
      await cmd.parseAsync(['apply', name, planFile], { from: 'user' });

      expect(mockApply).toHaveBeenCalledWith(planFile, {
        bypassTriggers: true
      });
      await unregisterRepair();
    });

    it('lets --bypass-triggers override a repair that defaults to false', async () => {
      const name = await registerRepair(false);
      const planFile = path.join(outDir, 'plan.jsonl');
      fs.writeFileSync(planFile, '');
      mockApply.mockResolvedValue(summary);

      const cmd = repairCommand();
      await cmd.parseAsync(['apply', name, planFile, '--bypass-triggers'], {
        from: 'user'
      });

      expect(mockApply).toHaveBeenCalledWith(planFile, {
        bypassTriggers: true
      });
      await unregisterRepair();
    });

    it('lets --no-bypass-triggers override a repair that defaults to true', async () => {
      const name = await registerRepair(true);
      const planFile = path.join(outDir, 'plan.jsonl');
      fs.writeFileSync(planFile, '');
      mockApply.mockResolvedValue(summary);

      const cmd = repairCommand();
      await cmd.parseAsync(['apply', name, planFile, '--no-bypass-triggers'], {
        from: 'user'
      });

      expect(mockApply).toHaveBeenCalledWith(planFile, {
        bypassTriggers: false
      });
      await unregisterRepair();
    });

    it('logs an error and never applies when repair name is unknown', async () => {
      const planFile = path.join(outDir, 'plan.jsonl');
      fs.writeFileSync(planFile, '');
      // Model process.exit as terminating control flow, as it does in production.
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((
        code?: number
      ) => {
        throw new Error(`process.exit:${code}`);
      }) as never);

      const cmd = repairCommand();
      await expect(
        cmd.parseAsync(['apply', 'nonexistent', planFile], { from: 'user' })
      ).rejects.toThrow('process.exit:1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unknown repair: "nonexistent"')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(mockApply).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });
  });
});
