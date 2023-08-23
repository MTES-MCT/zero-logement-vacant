import fs from 'node:fs/promises';
import path from 'node:path';
import downloader from '../downloader';

describe('Downloader', () => {
  describe('isPresent', () => {
    it('should return true if the file is present on the file system', async () => {
      const file = path.join(__dirname, 'dpe-01.zip');
      await fs.writeFile(file, '', 'utf8');

      const actual = await downloader.exists('01', { cwd: __dirname });

      expect(actual).toBeTrue();
      await fs.rm(file);
    });
  });
});
