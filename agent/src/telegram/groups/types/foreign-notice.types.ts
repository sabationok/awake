/**
 * Що робити зі сповіщенням про чужу групу: надіслати (`suppressed` — скільки приглушено за минуле вікно), надіслати
 * один рядок-підсумок (ліміт вікна вичерпано) або промовчати.
 */
export type ForeignNoticeDecision = { kind: 'notify'; suppressed: number } | { kind: 'summary' } | { kind: 'skip' };
