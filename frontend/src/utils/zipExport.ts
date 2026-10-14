/**
 * Lightweight, standard PKZip archive generator in pure TypeScript.
 * Generates valid ZIP files client-side without third-party dependencies.
 * Contains index.html, styles.css, script.js.
 */

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function calculateCrc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  name: string;
  content: string;
}

export function createZipArchive(files: ZipFileInput[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  // Local File Headers + Data
  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = calculateCrc32(dataBytes);

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true);         // Version needed to extract
    view.setUint16(6, 0, true);          // General purpose bit flag
    view.setUint16(8, 0, true);          // Compression method (0 = Store)
    view.setUint16(10, 0, true);         // Mod time
    view.setUint16(12, 0, true);         // Mod date
    view.setUint32(14, crc, true);       // CRC32
    view.setUint32(18, dataBytes.length, true); // Compressed size
    view.setUint32(22, dataBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true);         // Extra field length

    header.set(nameBytes, 30);

    fileRecords.push({
      nameBytes,
      dataBytes,
      crc,
      offset: currentOffset,
    });

    chunks.push(header);
    chunks.push(dataBytes);
    currentOffset += header.length + dataBytes.length;
  }

  // Central Directory Headers
  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  for (const record of fileRecords) {
    const cdir = new Uint8Array(46 + record.nameBytes.length);
    const view = new DataView(cdir.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory header signature
    view.setUint16(4, 20, true);         // Version made by
    view.setUint16(6, 20, true);         // Version needed
    view.setUint16(8, 0, true);          // Bit flag
    view.setUint16(10, 0, true);         // Compression method (0 = Store)
    view.setUint16(12, 0, true);         // Mod time
    view.setUint16(14, 0, true);         // Mod date
    view.setUint32(16, record.crc, true); // CRC32
    view.setUint32(20, record.dataBytes.length, true); // Compressed size
    view.setUint32(24, record.dataBytes.length, true); // Uncompressed size
    view.setUint16(28, record.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true);         // Extra field length
    view.setUint16(32, 0, true);         // File comment length
    view.setUint16(34, 0, true);         // Disk number start
    view.setUint16(36, 0, true);         // Internal file attributes
    view.setUint32(38, 0, true);         // External file attributes
    view.setUint32(42, record.offset, true); // Relative offset of local header

    cdir.set(record.nameBytes, 46);

    chunks.push(cdir);
    centralDirSize += cdir.length;
  }

  // End of Central Directory Record
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Disk number
  eocdView.setUint16(6, 0, true);          // Central dir disk
  eocdView.setUint16(8, fileRecords.length, true);  // Entries on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true);     // Central dir size
  eocdView.setUint32(16, centralDirStart, true);    // Central dir offset
  eocdView.setUint16(20, 0, true);         // Comment length

  chunks.push(eocd);

  const archiveBuffer = new ArrayBuffer(currentOffset + centralDirSize + eocd.length);
  const archiveBytes = new Uint8Array(archiveBuffer);
  let archiveOffset = 0;
  for (const chunk of chunks) {
    archiveBytes.set(chunk, archiveOffset);
    archiveOffset += chunk.length;
  }

  return new Blob([archiveBuffer], { type: 'application/zip' });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
