import fs from 'node:fs/promises';
import path from 'node:path';
import downloader from '../downloader';

describe('Downloader', () => {
  describe('isPresent', () => {
    it('should return true if the file is present on the file system', async () => {
      await fs.mkdir(path.join(import.meta.dirname, 'dpe-01'));
      const file = path.join(import.meta.dirname, 'dpe-01', 'bdnb.sql');
      await fs.writeFile(file, '', 'utf8');

      const actual = await downloader.exists('01', {
        cwd: import.meta.dirname
      });

      expect(actual).toBeTrue();

      await downloader.cleanup('01', { cwd: import.meta.dirname });

      const actual2 = await downloader.exists('01', {
        cwd: import.meta.dirname
      });

      expect(actual2).toBeFalse();
    });
  });
});
