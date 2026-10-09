import config from '../config/env';

// Devanagari through Malayalam: any Indian script. Romanised Hinglish is left as it is.
const INDIC = /[\u0900-\u0D7F]/;

export const needsTranslation = (text: string) => INDIC.test(text);

// The translate endpoint takes about 1000 characters; split long turns at sentence ends.
const chunks = (text: string, size = 900): string[] => {
  const parts = text.match(/[^।.!?]+[।.!?]*\s*/g) || [text];
  const out: string[] = [];
  for (const part of parts) {
    const last = out.length - 1;
    if (last >= 0 && out[last].length + part.length <= size) out[last] += part;
    else for (let i = 0; i < part.length; i += size) out.push(part.slice(i, i + size));
  }
  return out;
};

const translateChunk = async (input: string, source: string): Promise<string> => {
  const response = await fetch('https://api.sarvam.ai/translate', {
    method: 'POST',
    headers: { 'api-subscription-key': config.sarvam.translateKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, source_language_code: source, target_language_code: 'en-IN' })
  });
  if (!response.ok) throw new Error(`translate ${response.status}`);
  return ((await response.json()) as { translated_text: string }).translated_text;
};

/** English version of one transcript turn. Throws if the translation service fails. */
export const toEnglish = async (text: string): Promise<string> => {
  const out: string[] = [];
  for (const piece of chunks(text)) {
    // Auto-detect fails on very short or mixed lines; Hindi is the usual case.
    // eslint-disable-next-line no-await-in-loop
    out.push(await translateChunk(piece, 'auto').catch(() => translateChunk(piece, 'hi-IN')));
  }
  return out.join(' ').trim();
};

/** Runs `fn` over `items` with at most `limit` in flight. */
export const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      // eslint-disable-next-line no-await-in-loop
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};
