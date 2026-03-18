import type { PayrollConstants } from './types';

export const STORAGE_KEY = 'pay-slip:employees';

export const DEFAULT_CONSTANTS: PayrollConstants = {
  allowanceBase: 1_000_000,
  workingHoursPerDay: 8,
  otMultiplier1: 1.5,  // weekday OT
  otMultiplier2: 2.0,  // weekend OT
  otMultiplier3: 3.0,  // holiday OT
  otWarningYellow: 40,
  otWarningRed: 72,
  bhxhRate: 0.105,
};
