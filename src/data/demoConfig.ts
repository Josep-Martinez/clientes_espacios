import type { DemoFeeRates } from '../domain/pricing.ts';

/** Sample percentages only. They are not approved platform rates. */
export const DEMO_FEES: DemoFeeRates = {
  serviceCommissionPercent: 10,
  spaceCommissionPercent: 12,
};

export const DEMO_CLIENT_ID = 'cliente-trama-demo';
export const DEMO_CLIENT_NAME = 'Nerea · cliente demo';
export const DEMO_CUSTOMER_AREA_RADIUS_KM = 7;
export const DEMO_STORAGE_KEY = 'trama-marketplace-demo-v1';
export const DEMO_TIME_LABEL = 'Simulación determinista; no son rutas en tiempo real';
export const DEMO_BOOKING_MODE_LABELS = {
  room: 'Sala de terceros',
  gym: 'Gimnasio',
  home: 'A domicilio',
  online: 'En línea',
} as const;

export const DEMO_DECISIONS_NOTICE =
  'Comisiones, recurrencias y condiciones de cancelación son ejemplos pendientes de definir.';
