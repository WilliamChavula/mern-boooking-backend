import { z } from "zod";
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const loginErrorResponse: z.ZodObject<{
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
export declare const loginSuccessResponse: z.ZodObject<{
    success: z.ZodLiteral<true>;
    message: z.ZodString;
    data: z.ZodObject<{
        token: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
    }, {
        token: string;
    }>;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: true;
    data: {
        token: string;
    };
}, {
    message: string;
    success: true;
    data: {
        token: string;
    };
}>;
export type LoginSchema = z.infer<typeof loginSchema>;
export type LoginResponse = z.infer<typeof loginSuccessResponse> | z.infer<typeof loginErrorResponse>;
