import { z } from 'zod';
import { ALERT_STATUSES, RULE_TYPES, SEVERITIES } from './constants';

export const alertCandidateSchema = z.object({
  vesselId: z.string(),
  ruleType: z.enum(RULE_TYPES),
  severity: z.enum(SEVERITIES),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  evidenceJson: z.record(z.string(), z.unknown()),
});
export type AlertCandidate = z.infer<typeof alertCandidateSchema>;

export const alertStatusSchema = z.enum(ALERT_STATUSES);

export const dispatchAlertSchema = z.object({
  /** Konfirmasi eksplisit saat dispatch alert milik agency lain (handoff) */
  confirmHandoff: z.boolean().optional(),
});

export const escalateAlertSchema = z.object({
  toAgencyCode: z.string(),
  reason: z.string().min(3),
});

export const falsePositiveSchema = z.object({
  reason: z.string().min(3),
});
