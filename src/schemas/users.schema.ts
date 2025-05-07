import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z
    .string({ message: "First Name is required" })
    .min(2, "First Name must be at least 2 characters"),
  lastName: z
    .string({ message: "Last Name is required" })
    .min(2, "Last Name must be at least 2 characters"),
  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
});

const createUserSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z
    .object({
      id: z.string(),
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
    })
    .optional(),
});

const createUserFailureResponseSchema = z.object({
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

const userSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const userSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: userSchema,
});

const tokenValidResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    userId: z.string(),
    email: z.string(),
  }),
});

const tokenInvalidResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type CreateUserResponseSchema =
  | z.infer<typeof createUserSuccessResponseSchema>
  | z.infer<typeof createUserFailureResponseSchema>;

export type TokenResponseSchema =
  | z.infer<typeof tokenValidResponseSchema>
  | z.infer<typeof tokenInvalidResponseSchema>;

export type UserResponseSchema =
  | z.infer<typeof userSuccessResponseSchema>
  | z.infer<typeof tokenInvalidResponseSchema>;
