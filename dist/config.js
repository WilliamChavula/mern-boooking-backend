"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
require("dotenv/config");
const configSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number(),
    MONGODB_URI: zod_1.z.string(),
    SECRET_KEY: zod_1.z.string(),
    NODE_ENV: zod_1.z.enum(["development", "production"]),
    FRONTEND_URL: zod_1.z.string().url("FRONTEND_URL must be a valid URL"),
});
exports.config = configSchema.parse(process.env);
//# sourceMappingURL=config.js.map