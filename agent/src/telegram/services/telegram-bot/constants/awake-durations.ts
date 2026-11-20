/** Тривалість для команди Mac: 30m, 2h, 1d. */
export const DURATION_PATTERN = /^\d{1,3}[mhd]$/;

/** Кнопки під /awake; callback_data = start:<duration>. */
export const AWAKE_QUICK_DURATIONS = [
  { duration: '1h', label: '1 год' },
  { duration: '2h', label: '2 год' },
  { duration: '4h', label: '4 год' },
];
