import { z } from "zod";

/** Demo login uses `demo@local` — not a public TLD, so avoid strict `.email()`. */
export const demoLoginBodySchema = z.object({
  email: z.string().min(1).max(320),
  password: z.string().min(1).max(256),
});

export const demoPostBodySchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().max(50_000).optional().default(""),
});

export type DemoLoginBody = z.infer<typeof demoLoginBodySchema>;
export type DemoPostBody = z.infer<typeof demoPostBodySchema>;
