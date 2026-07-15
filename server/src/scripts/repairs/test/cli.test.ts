import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApplySummary, PlanSummary } from '../lib/types';

// Mock the underlying functions before importing the CLI
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
    it('prints "No repairs registered." when registry is empty', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const cmd = repairCommand();
      await cmd.parseAsync(['list'], { from: 'user' });
      expect(consoleSpy).toHaveBeenCalledWith('No repairs registered.');
      consoleSpy.mockRestore();
    });

    it('lists repair names when registry has entries', async () => {
      const { repairs } = await import('../index');
      (repairs as Record<string, unknown>)['test-repair'] = {
        name: 'test-repair',
        query: async () => [],
        decide: () => ({ action: 'skip' as const })
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const cmd = repairCommand();
      await cmd.parseAsync(['list'], { from: 'user' });
      expect(consoleSpy).toHaveBeenCalledWith('test-repair');
      consoleSpy.mockRestore();

      delete (repairs as Record<string, unknown>)['test-repair'];
    });
  });

  describe('plan', () => {
    it('calls plan() with the named repair and prints summary', async () => {
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

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const cmd = repairCommand();
      await cmd.parseAsync(['plan', 'my-repair', '--out', outDir], {
        from: 'user'
      });

      expect(mockPlan).toHaveBeenCalledOnce();
      expect(mockPlan).toHaveBeenCalledWith(
        (repairs as Record<string, unknown>)['my-repair'],
        { outDir }
      );
      expect(consoleSpy).toHaveBeenCalledWith('Total:    10');
      expect(consoleSpy).toHaveBeenCalledWith('Planned:  8');
      consoleSpy.mockRestore();

      delete (repairs as Record<string, unknown>)['my-repair'];
    });

    it('exits with error when repair name is unknown', async () => {
      const consoleErrSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as never);

      const cmd = repairCommand();
      await cmd.parseAsync(['plan', 'nonexistent'], { from: 'user' });

      expect(consoleErrSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown repair: "nonexistent"')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleErrSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('stats', () => {
    it('calls stats() with the plan file and prints summary', async () => {
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

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const cmd = repairCommand();
      await cmd.parseAsync(['stats', planFile], { from: 'user' });

      expect(mockStats).toHaveBeenCalledWith(planFile);
      expect(consoleSpy).toHaveBeenCalledWith('Planned:  5');
      expect(consoleSpy).toHaveBeenCalledWith('Events to delete: 2');
      expect(consoleSpy).toHaveBeenCalledWith('Events to create: 3');
      consoleSpy.mockRestore();
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

    it('calls apply() with the plan file and prints summary', async () => {
      const name = await registerRepair();
      const planFile = path.join(outDir, 'plan.jsonl');
      fs.writeFileSync(planFile, '');
      mockApply.mockResolvedValue(summary);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const cmd = repairCommand();
      await cmd.parseAsync(['apply', name, planFile], { from: 'user' });

      expect(mockApply).toHaveBeenCalledWith(planFile, {
        bypassTriggers: false
      });
      expect(consoleSpy).toHaveBeenCalledWith('Updated:         7');
      expect(consoleSpy).toHaveBeenCalledWith('Events deleted:  4');
      expect(consoleSpy).toHaveBeenCalledWith('Events created:  2');
      consoleSpy.mockRestore();
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

    it('exits with error and never applies when repair name is unknown', async () => {
      const planFile = path.join(outDir, 'plan.jsonl');
      fs.writeFileSync(planFile, '');
      const consoleErrSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
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

      expect(consoleErrSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown repair: "nonexistent"')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(mockApply).not.toHaveBeenCalled();
      consoleErrSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
