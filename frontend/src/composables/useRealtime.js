export const normalizeRealtimeKey = value => String(value || '').trim().replace(/^\[|\]$/g, '').toLowerCase();

export const nextRealtimeRetryDelay = current => Math.min(current * 2, 60_000);
