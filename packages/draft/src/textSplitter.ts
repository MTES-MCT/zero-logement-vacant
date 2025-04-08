import Hypher from 'hypher';
import fr from 'hyphenation.fr';
import pixelWidth from 'string-pixel-width';

const h = new Hypher(fr);

export function hyphenateAndChunk(text: string, maxWidth: number, maxHeight: number): string[][] {
    const paragraphs = text.split('\n');
    const allLines = [];
  
    for (let paragraph of paragraphs) {
    const words: string[] = paragraph.split(' ').map((word: string): string => h.hyphenateText(word));
      let currentLine = '';
  
      for (let word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const lineWidth = pixelWidth(testLine, { size: 12, font: 'arial' }); // TODO : Marianne and font size
  
        if (lineWidth > maxWidth) {
          allLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) allLines.push(currentLine);
      allLines.push('');
    }
  
    const lineHeight = Math.round(12 * 1.2); // TODO font size and line height
    const maxLinesPerBlock = Math.floor(maxHeight / lineHeight);
  
    const blocks = [];
    for (let i = 0; i < allLines.length; i += maxLinesPerBlock) {
      const block = allLines.slice(i, i + maxLinesPerBlock);
      blocks.push(block);
    }
  
    return blocks;
  }
