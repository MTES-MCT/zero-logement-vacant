import async from 'async';
import * as path from 'node:path';
import sharp, { Color, OutputInfo } from 'sharp';

import { HousingStatus } from '@zerologementvacant/models';
import statusColors from '../components/Map/status-colors';

const SIZE = 17;
const BORDER_SIZE = 1;

interface CreateImageOptions {
  border: Color;
  background: Color;
  filename: string;
}

const directory = path.join(__dirname, '..', '..', 'public', 'map');

async function createImage(options: CreateImageOptions): Promise<OutputInfo> {
  return sharp({
    create: {
      channels: 3,
      background: options.background,
      width: SIZE,
      height: SIZE
    }
  })
    .extend({
      top: BORDER_SIZE,
      right: BORDER_SIZE,
      bottom: BORDER_SIZE,
      left: BORDER_SIZE,
      background: options.border
    })
    .png()
    .toFile(path.join(directory, options.filename));
}

createImage({
  border: statusColors.defaultBorderColor,
  background: statusColors.defaultBackgroundColor,
  filename: `square-fill-${HousingStatus.NEVER_CONTACTED}.png`
});

async.forEachOf(
  statusColors.borderColors,
  async ([status, borderColor], index) => {
    const [, backgroundColor] = statusColors.backgroundColors[index as number];
    return createImage({
      border: borderColor,
      background: backgroundColor,
      filename: `square-fill-${status}.png`
    });
  }
);
