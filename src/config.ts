import { z } from "zod";
import "dotenv/config";

const configSchema = z.object({
  PORT: z.coerce.number(),
  MONGODB_URI: z.string(),
  SECRET_KEY: z.string(),
  NODE_ENV: z.enum(["development", "production"]),
});

export const config = configSchema.parse(process.env);
