"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseZodError = void 0;
const parseZodError = (err) => {
    return err.errors.map((err) => ({
        message: err.message,
        path: err.path.map((p) => p.toString()),
    }));
};
exports.parseZodError = parseZodError;
//# sourceMappingURL=parse-zod-error.js.map