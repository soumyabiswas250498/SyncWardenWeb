import { z } from "zod";

export const signinSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SigninFormValues = z.infer<typeof signinSchema>;
