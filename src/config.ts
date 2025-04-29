import { z } from "zod";
import "dotenv/config";

const configSchema = z.object({
  PORT: z.coerce.number(),
  MONGODB_URI: z.string(),
});

export const config = configSchema.parse(process.env);
