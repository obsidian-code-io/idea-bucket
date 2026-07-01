// Zod schemas shared across routes.
import { z } from "zod";

export const STATUSES = [
  "backlog",
  "in_review",
  "approved",
  "in_progress",
  "done",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  in_review: "In Review",
  approved: "Approved",
  in_progress: "In Progress",
  done: "Done",
};

export const statusSchema = z.enum(STATUSES);

export const onboardingSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(80),
  email: z.string().trim().email("A valid email is required").max(200),
  phone: z.string().trim().min(1, "Phone number is required").max(40),
});

export const newIdeaSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional().default(""),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type NewIdeaInput = z.infer<typeof newIdeaSchema>;
