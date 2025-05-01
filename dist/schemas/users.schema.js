"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    firstName: zod_1.z
        .string({ message: "First Name is required" })
        .min(2, "First Name must be at least 2 characters"),
    lastName: zod_1.z
        .string({ message: "Last Name is required" })
        .min(2, "Last Name must be at least 2 characters"),
    password: zod_1.z
        .string({ message: "Password is required" })
        .min(8, "Password must be at least 8 characters"),
});
const createUserSuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z
        .object({
        id: zod_1.z.string(),
        email: zod_1.z.string(),
        firstName: zod_1.z.string(),
        lastName: zod_1.z.string(),
    })
        .optional(),
});
const createUserFailureResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    message: zod_1.z.string(),
    error: zod_1.z
        .object({
        message: zod_1.z.string(),
        path: zod_1.z.string().array(),
    })
        .array()
        .optional(),
});
const tokenValidResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        userId: zod_1.z.string(),
        email: zod_1.z.string(),
    }),
});
const tokenInvalidResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    message: zod_1.z.string(),
});
//# sourceMappingURL=users.schema.js.map