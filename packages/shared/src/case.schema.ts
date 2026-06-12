import { z } from 'zod';
import { CASE_STATUSES } from './constants';

export const caseStatusSchema = z.enum(CASE_STATUSES);

export const caseStatusChangeSchema = z.object({
  toStatus: caseStatusSchema,
  note: z.string().optional(),
});

export const caseNoteSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const caseHandoffSchema = z.object({
  toAgencyCode: z.string(),
  reason: z.string().min(3),
});

export { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_WHITELIST } from './constants';
