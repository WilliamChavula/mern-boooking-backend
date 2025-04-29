import { ZodError } from "zod";

type PayLoadError = {
  message: string;
  path: string[];
};

export const parseZodError = (err: ZodError): PayLoadError[] => {
  return err.errors.map((err) => ({
    message: err.message,
    path: err.path.map((p) => p.toString()),
  }));
};
