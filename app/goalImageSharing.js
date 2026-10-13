// Kept independent of React so validation and temporary-file cleanup can be tested.
async function shareGeneratedImage({ base64, requestId }, fileSystem, sharing) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(requestId || '') || typeof base64 !== 'string' ||
      base64.length > 12 * 1024 * 1024 || !base64.startsWith('iVBORw0KGgo') || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('Invalid or oversized share image');
  }
  if (!await sharing.isAvailableAsync()) throw new Error('Sharing is unavailable on this device');
  const uri = `${fileSystem.cacheDirectory}wishtrail-${requestId}.png`;
  try {
    await fileSystem.writeAsStringAsync(uri, base64, { encoding: fileSystem.EncodingType.Base64 });
    await sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your journey' });
  } finally {
    await fileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
module.exports = { shareGeneratedImage };
