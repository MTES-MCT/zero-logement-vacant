import { describe, it, expect, beforeAll } from 'vitest';
import config from './config';
import { scanBuffer } from './clamav';

// EICAR test file - standard antivirus test string
// This is NOT a real virus, it's a test pattern recognized by all antivirus software
const EICAR_TEST_FILE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

// Run tests only when ClamAV is enabled
const describeIfClamavEnabled = config.clamav.enabled ? describe : describe.skip;

describeIfClamavEnabled('ClamAV scanBuffer', () => {
  beforeAll(() => {
    // Ensure ClamAV is running
    if (!config.clamav.enabled) {
      console.warn('ClamAV tests skipped. Set CLAMAV_ENABLED=true to run them.');
    }
  });

  it('should detect EICAR test file as infected', async () => {
    const buffer = Buffer.from(EICAR_TEST_FILE);

    const result = await scanBuffer(buffer, 'eicar-test.txt');

    expect(result.isInfected).toBe(true);
    expect(result.viruses).toHaveLength(1);
    expect(result.viruses[0]).toContain('EICAR');
    expect(result.file).toBe('eicar-test.txt');
  }, 30000); // 30s timeout for ClamAV scan

  it('should pass clean file as not infected', async () => {
    const cleanContent = 'This is a clean text file with no malicious content.';
    const buffer = Buffer.from(cleanContent);

    const result = await scanBuffer(buffer, 'clean.txt');

    expect(result.isInfected).toBe(false);
    expect(result.viruses).toHaveLength(0);
    expect(result.file).toBe('clean.txt');
  }, 30000);

  it('should handle empty file', async () => {
    const buffer = Buffer.from('');

    const result = await scanBuffer(buffer, 'empty.txt');

    expect(result.isInfected).toBe(false);
    expect(result.viruses).toHaveLength(0);
  }, 30000);

  it('should scan binary file (PNG)', async () => {
    // Valid 1x1 PNG file
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ]);

    const result = await scanBuffer(pngBuffer, 'test.png');

    expect(result.isInfected).toBe(false);
    expect(result.viruses).toHaveLength(0);
  }, 30000);

  it('should scan large file', async () => {
    // Create a 1MB clean file
    const size = 1024 * 1024; // 1MB
    const buffer = Buffer.alloc(size, 'a');

    const result = await scanBuffer(buffer, 'large.txt');

    expect(result.isInfected).toBe(false);
    expect(result.viruses).toHaveLength(0);
  }, 30000);
});
