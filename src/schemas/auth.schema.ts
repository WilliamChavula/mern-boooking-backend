import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .email("Please enter valid email address"),
  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
});

export const loginErrorResponse = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z
    .object({
      message: z.string(),
      path: z.string().array(),
    })
    .array()
    .optional(),
});

export const loginSuccessResponse = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    token: z.string(),
  }),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type LoginResponse =
  | z.infer<typeof loginSuccessResponse>
  | z.infer<typeof loginErrorResponse>;
