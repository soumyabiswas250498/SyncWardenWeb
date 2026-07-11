import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(120, "Name is too long"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    phone: z
      .string()
      .min(1, "Phone is required")
      .refine((value) => isValidPhoneNumber(value), "Enter a valid phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long")
      .regex(/[A-Z]/, "Add at least one uppercase letter")
      .regex(/[a-z]/, "Add at least one lowercase letter")
      .regex(/[0-9]/, "Add at least one number")
      .regex(/[^A-Za-z0-9\s]/, "Add at least one symbol"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
