import { z } from 'zod';
import { RULE_TYPES, SEVERITIES } from './constants';

// Batas perairan Indonesia (kasar) — konsol uji tidak boleh spawn di luar area kerja
export const spawnVesselSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  flag: z.string().length(3).default('IDN'),
  vesselType: z.string().min(1).max(32).default('fishing'),
  lat: z.number().min(-15).max(10),
  lng: z.number().min(90).max(145),
});
export type SpawnVesselInput = z.infer<typeof spawnVesselSchema>;

export const stepVesselSchema = z.object({
  headingDeg: z.number().min(0).max(360).optional(),
  sogKnots: z.number().min(0).max(30).default(10),
  stepMinutes: z.number().min(1).max(120).default(30),
  /** lat+lng eksplisit = teleport step (abaikan heading/SOG) */
  lat: z.number().min(-15).max(10).optional(),
  lng: z.number().min(90).max(145).optional(),
});
export type StepVesselInput = z.infer<typeof stepVesselSchema>;

export const injectAlertSchema = z.object({
  vesselId: z.string().min(1),
  ruleType: z.enum(RULE_TYPES),
  severity: z.enum(SEVERITIES),
});
export type InjectAlertInput = z.infer<typeof injectAlertSchema>;

export const runEngineSchema = z.object({
  windowHours: z.number().min(1).max(168).optional(),
});
export type RunEngineInput = z.infer<typeof runEngineSchema>;

export const seedDemoSchema = z.object({
  reset: z.boolean().default(false),
});
