"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSuccessResponse = exports.loginErrorResponse = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string({ message: "Email is required" })
        .email("Please enter valid email address"),
    password: zod_1.z
        .string({ message: "Password is required" })
        .min(8, "Password must be at least 8 characters"),
});
exports.loginErrorResponse = zod_1.z.object({
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
exports.loginSuccessResponse = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        token: zod_1.z.string(),
    }),
});
//# sourceMappingURL=auth.schema.js.map