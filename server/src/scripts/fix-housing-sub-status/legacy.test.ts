import { HousingStatus } from '@zerologementvacant/models';
import { describe, expect, it } from 'vitest';

import { normalizeEventPair, normalizePair, requiresSubStatus } from './legacy';

describe('requiresSubStatus', () => {
  it('is true only for FIRST_CONTACT, IN_PROGRESS, COMPLETED, BLOCKED', () => {
    expect(requiresSubStatus(HousingStatus.FIRST_CONTACT)).toBe(true);
    expect(requiresSubStatus(HousingStatus.BLOCKED)).toBe(true);
    expect(requiresSubStatus(HousingStatus.NEVER_CONTACTED)).toBe(false);
    expect(requiresSubStatus(HousingStatus.WAITING)).toBe(false);
  });
});

describe('normalizePair (current status is a known HousingStatus)', () => {
  it('keeps a valid pair as-is', () => {
    expect(
      normalizePair(HousingStatus.IN_PROGRESS, 'En accompagnement')
    ).toMatchObject({
      ok: true,
      status: HousingStatus.IN_PROGRESS,
      subStatus: 'En accompagnement'
    });
  });

  it('forces sub-status to null for statuses that forbid one', () => {
    expect(normalizePair(HousingStatus.WAITING, 'anything')).toMatchObject({
      ok: true,
      status: HousingStatus.WAITING,
      subStatus: null
    });
  });

  it('renames a legacy sub-status, keeping the status', () => {
    // "Projet qui n'aboutit pas" (straight apostrophe, as stored) → BLOCKED sub
    const result = normalizePair(
      HousingStatus.BLOCKED,
      "Projet qui n'aboutit pas"
    );
    expect(result).toMatchObject({
      ok: true,
      status: HousingStatus.BLOCKED,
      subStatus: 'Blocage involontaire du propriétaire'
    });
  });

  it('renames NPAI and moves the housing to FIRST_CONTACT', () => {
    const result = normalizePair(HousingStatus.COMPLETED, 'NPAI');
    expect(result).toMatchObject({
      ok: true,
      status: HousingStatus.FIRST_CONTACT
    });
    // resolves to the exact current sub-status regardless of apostrophe form
    expect(result.ok && result.subStatus).toMatch(
      /^N.habite pas à l.adresse indiquée$/
    );
  });

  it('maps "Mutation en cours" to IN_PROGRESS + "Mutation en cours ou effectuée"', () => {
    expect(
      normalizePair(HousingStatus.IN_PROGRESS, 'Mutation en cours')
    ).toMatchObject({
      ok: true,
      status: HousingStatus.IN_PROGRESS,
      subStatus: 'Mutation en cours ou effectuée'
    });
  });

  it('is invalid for a cross-status valid sub (does not guess)', () => {
    // "Sortie de la vacance" is a COMPLETED sub, on a FIRST_CONTACT status
    expect(
      normalizePair(HousingStatus.FIRST_CONTACT, 'Sortie de la vacance')
    ).toMatchObject({ ok: false, reason: 'invalid-sub-status' });
  });

  it('is invalid for a required-but-null sub-status', () => {
    expect(normalizePair(HousingStatus.COMPLETED, null)).toMatchObject({
      ok: false,
      reason: 'invalid-sub-status'
    });
  });
});

describe('normalizeEventPair (status is a label, maybe legacy or missing)', () => {
  it('maps a current label + valid sub', () => {
    expect(
      normalizeEventPair('Suivi terminé', 'Sortie de la vacance')
    ).toMatchObject({
      ok: true,
      status: HousingStatus.COMPLETED,
      subStatus: 'Sortie de la vacance'
    });
  });

  it('maps the legacy status "Bloqué" to BLOCKED', () => {
    expect(
      normalizeEventPair('Bloqué', 'Immeuble / Environnement')
    ).toMatchObject({
      ok: true,
      status: HousingStatus.BLOCKED,
      subStatus: 'Immeuble / Environnement'
    });
  });

  it('maps the legacy status "Sortie de la vacance" to COMPLETED / "Sortie de la vacance", ignoring the event sub', () => {
    expect(normalizeEventPair('Sortie de la vacance', 'Vendu')).toMatchObject({
      ok: true,
      status: HousingStatus.COMPLETED,
      subStatus: 'Sortie de la vacance'
    });
  });

  it('maps the legacy status "Non-vacant" to COMPLETED / "N\'était pas vacant"', () => {
    const result = normalizeEventPair('Non-vacant', undefined);
    expect(result).toMatchObject({ ok: true, status: HousingStatus.COMPLETED });
    expect(result.ok && result.subStatus).toMatch(/^N.était pas vacant$/);
  });

  it('is unusable when the status label is missing', () => {
    expect(normalizeEventPair(undefined, 'Sortie de la vacance')).toMatchObject(
      {
        ok: false,
        reason: 'no-status'
      }
    );
  });

  it('is unusable for an unknown legacy status label', () => {
    expect(normalizeEventPair('Accompagnement terminé', 'Vendu')).toMatchObject(
      {
        ok: false,
        reason: 'unknown-status-label'
      }
    );
    expect(normalizeEventPair('Sans suite', null)).toMatchObject({
      ok: false,
      reason: 'unknown-status-label'
    });
  });

  it('is unusable when the event status decodes but the sub-status is nulled (the bulk bug)', () => {
    expect(normalizeEventPair('Suivi bloqué', null)).toMatchObject({
      ok: false,
      reason: 'invalid-sub-status'
    });
  });
});
