/**
 * CRC16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF), exigido pelo campo 63 do BR Code.
 * Retorna 4 dígitos hexadecimais maiúsculos.
 */
export function crc16Ccitt(input: string): string {
  let crc = 0xffff;
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
