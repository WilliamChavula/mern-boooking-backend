export const parseZodError = (err) => {
    return err.errors.map((err) => ({
        message: err.message,
        path: err.path.map((p) => p.toString()),
    }));
};
//# sourceMappingURL=parse-zod-error.js.map