import { ZodError } from "zod";
type PayLoadError = {
    message: string;
    path: string[];
};
export declare const parseZodError: (err: ZodError) => PayLoadError[];
export {};
