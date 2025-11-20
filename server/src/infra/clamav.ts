import NodeClam from 'clamscan';
import { Readable } from 'stream';
import { logger } from './logger';

/**
 * ClamAV configuration options
 */
const CLAMAV_OPTIONS: NodeClam.Options = {
  removeInfected: false, // Do not automatically remove infected files
  quarantineInfected: false, // Do not quarantine infected files
  debugMode: process.env.NODE_ENV === 'development',

  clamdscan: {
    // Use ClamD daemon for better performance
    socket: process.env.CLAMAV_SOCKET || '/var/run/clamav/clamd.sock',
    host: process.env.CLAMAV_HOST || '127.0.0.1',
    port: process.env.CLAMAV_PORT ? parseInt(process.env.CLAMAV_PORT) : 3310,
    timeout: 60000, // 60 seconds timeout
    localFallback: true, // Fallback to local if daemon unavailable
    path: process.env.CLAMAV_BIN_PATH || '/usr/bin/clamdscan',
    configFile: process.env.CLAMAV_CONFIG_FILE || '/etc/clamav/clamd.conf',
    multiscan: true,
    reloadDb: false,
    active: true,
    bypassTest: false
  },

  preference: 'clamdscan' // Prefer clamdscan over clamscan
};

/**
 * ClamAV scanner instance (singleton)
 */
let clamavInstance: NodeClam | null = null;

/**
 * Initialize ClamAV scanner
 *
 * @returns Initialized ClamAV instance
 * @throws Error if ClamAV initialization fails
 */
export async function initClamAV(): Promise<NodeClam> {
  if (clamavInstance) {
    return clamavInstance;
  }

  try {
    logger.info('Initializing ClamAV scanner...', {
      host: CLAMAV_OPTIONS.clamdscan?.host,
      port: CLAMAV_OPTIONS.clamdscan?.port,
      socket: CLAMAV_OPTIONS.clamdscan?.socket
    });

    clamavInstance = await new NodeClam().init(CLAMAV_OPTIONS);

    // Test connection
    const version = await clamavInstance.getVersion();
    logger.info('ClamAV initialized successfully', {
      version: version.trim()
    });

    return clamavInstance;
  } catch (error) {
    logger.error('Failed to initialize ClamAV', {
      error: error instanceof Error ? error.message : String(error),
      options: CLAMAV_OPTIONS
    });
    throw new Error(`ClamAV initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get ClamAV instance (lazy initialization)
 *
 * @returns ClamAV instance
 * @throws Error if initialization fails
 */
export async function getClamAV(): Promise<NodeClam> {
  if (!clamavInstance) {
    return await initClamAV();
  }
  return clamavInstance;
}

/**
 * Check if ClamAV is available and running
 *
 * @returns true if ClamAV is available
 */
export async function isClamAVAvailable(): Promise<boolean> {
  try {
    const clam = await getClamAV();
    await clam.getVersion();
    return true;
  } catch (error) {
    logger.warn('ClamAV is not available', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Scan a buffer for viruses
 *
 * @param buffer - File buffer to scan
 * @param filename - Original filename (for logging)
 * @returns Scan result with virus detection info
 */
export async function scanBuffer(
  buffer: Buffer,
  filename: string
): Promise<{
  isInfected: boolean;
  viruses: string[];
  file: string;
}> {
  const clam = await getClamAV();

  try {
    logger.info('Starting virus scan', {
      filename,
      size: buffer.length,
      action: 'scan.started'
    });

    const startTime = Date.now();

    // Convert buffer to readable stream for scanning
    const stream = Readable.from(buffer);

    // Scan the stream
    const result = await clam.scanStream(stream);

    const scanDuration = Date.now() - startTime;

    if (result.isInfected) {
      logger.warn('Virus detected in file', {
        filename,
        viruses: result.viruses,
        size: buffer.length,
        scanDuration,
        action: 'virus_detected'
      });
    } else {
      logger.info('File scan completed - clean', {
        filename,
        size: buffer.length,
        scanDuration,
        action: 'scan.completed'
      });
    }

    return {
      isInfected: result.isInfected ?? false,
      viruses: result.viruses ?? [],
      file: filename
    };
  } catch (error) {
    logger.error('Error during virus scan', {
      filename,
      error: error instanceof Error ? error.message : String(error),
      action: 'scan.error'
    });
    throw error;
  }
}

export default {
  initClamAV,
  getClamAV,
  isClamAVAvailable,
  scanBuffer
};
