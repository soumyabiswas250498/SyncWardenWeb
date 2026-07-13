import { z } from "zod";

export const registerDeviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give this device a name")
    .max(120, "Name must be 120 characters or fewer"),
  kind: z.enum(["permanent", "temporary"]),
  // Required by the backend (1-32 chars after trim); maps to the app's static icon set.
  iconCode: z
    .string()
    .trim()
    .min(1, "Pick an icon for this device")
    .max(32, "Icon code must be 32 characters or fewer"),
  // Only used for temporary devices; backend allows 1-168 hours.
  durationHours: z.coerce.number().int().min(1).max(168),
});

export type RegisterDeviceFormValues = z.infer<typeof registerDeviceSchema>;
