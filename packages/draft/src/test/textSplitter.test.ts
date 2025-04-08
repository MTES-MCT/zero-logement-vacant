import { hyphenateAndChunk } from '../textSplitter';
import Hypher from 'hypher';
import fr from 'hyphenation.fr';
import pixelWidth from 'string-pixel-width';

jest.mock('string-pixel-width', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedPixelWidth = pixelWidth as jest.MockedFunction<typeof pixelWidth>;

describe('hyphenateAndChunk', () => {
  beforeEach(() => {
    mockedPixelWidth.mockReset();
  });

  it('should split a paragraph into lines and blocks based on constraints', () => {
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed id risus at justo mollis condimentum. Quisque vel leo at ex consequat feugiat. Aenean pretium est et tempus pulvinar. Suspendisse faucibus, tellus eget posuere hendrerit, urna nunc vulputate augue, eget volutpat metus magna ut tortor. Fusce sed augue quam. Phasellus a odio sed lacus fringilla eleifend. Vestibulum posuere nulla sit amet arcu lacinia, nec finibus arcu euismod. Donec sit amet tellus non purus tristique finibus sed ut enim. Donec tincidunt libero purus, nec ultricies purus ullamcorper sit amet. Mauris auctor dictum commodo. Etiam at volutpat lorem, eget tincidunt diam. Phasellus molestie luctus nunc, eget hendrerit nunc tincidunt in. Proin et tincidunt velit. Curabitur ultricies ullamcorper velit sit amet fringilla. ';
    
    // Simulate a basic width per character
    mockedPixelWidth.mockImplementation((str) => str.length * 6); // ~6px per character

    const maxWidth = 200; // 6px per character => ~33 characters per line
    const maxHeight = 40; // 1.2 line height => ~33 lines per block

    const result = hyphenateAndChunk(text, maxWidth, maxHeight);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    for (const block of result) {
      // Each block should have at most 50 lines
      expect(block.length).toBeLessThanOrEqual(50);

      for (const line of block) {
        const cleanLine = line.replace(/[\u00AD\u2010-\u2015]/g, ''); // Remove hyphens
        const lineWidth = cleanLine.length * 6;
        console.log(cleanLine)
        expect(lineWidth).toBeLessThanOrEqual(maxWidth);
      }
    }
  });

  it('should handle line breaks in the input text', () => {
    mockedPixelWidth.mockImplementation((str) => str.length * 6);
    
    const text = 'Hello sir,\nPlease find your document attached.';
    const result = hyphenateAndChunk(text, 120, 60);

    expect(result.flat().join('\n')).toContain('Hello sir,');
    expect(result.flat().join('\n')).toContain('Please find');
  });

  it('should return an empty block for empty string', () => {
    mockedPixelWidth.mockImplementation(() => 0);
    const result = hyphenateAndChunk('', 100, 100);
    expect(result.flat()).toEqual(['']);
  });
});
