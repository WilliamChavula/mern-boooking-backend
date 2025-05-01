import { z } from "zod";
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}>;
declare const createUserSuccessResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        firstName: string;
        lastName: string;
        id: string;
    }, {
        email: string;
        firstName: string;
        lastName: string;
        id: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: true;
    data?: {
        email: string;
        firstName: string;
        lastName: string;
        id: string;
    } | undefined;
}, {
    message: string;
    success: true;
    data?: {
        email: string;
        firstName: string;
        lastName: string;
        id: string;
    } | undefined;
}>;
declare const createUserFailureResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    message: z.ZodString;
    error: z.ZodOptional<z.ZodArray<z.ZodObject<{
        message: z.ZodString;
        path: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        path: string[];
        message: string;
    }, {
        path: string[];
        message: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: false;
    error?: {
        path: string[];
        message: string;
    }[] | undefined;
}, {
    message: string;
    success: false;
    error?: {
        path: string[];
        message: string;
    }[] | undefined;
}>;
declare const tokenValidResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    message: z.ZodString;
    data: z.ZodObject<{
        userId: z.ZodString;
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        userId: string;
    }, {
        email: string;
        userId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: true;
    data: {
        email: string;
        userId: string;
    };
}, {
    message: string;
    success: true;
    data: {
        email: string;
        userId: string;
    };
}>;
declare const tokenInvalidResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: false;
}, {
    message: string;
    success: false;
}>;
export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type CreateUserResponseSchema = z.infer<typeof createUserSuccessResponseSchema> | z.infer<typeof createUserFailureResponseSchema>;
export type TokenResponseSchema = z.infer<typeof tokenValidResponseSchema> | z.infer<typeof tokenInvalidResponseSchema>;
export {};
