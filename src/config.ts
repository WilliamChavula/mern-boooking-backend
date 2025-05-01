import { z } from "zod";
import "dotenv/config";

const configSchema = z.object({
  PORT: z.coerce.number(),
  MONGODB_URI: z.string(),
  SECRET_KEY: z.string(),
  NODE_ENV: z.enum(["development", "production"]),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  CLOUDINARY_API_SECRET: z.string({
    message: "CLOUDINARY_API_SECRET is Required",
  }),
  CLOUDINARY_NAME: z.string({ message: "CLOUDINARY_NAME is Required" }),
  CLOUDINARY_API_KEY: z.string({ message: "CLOUDINARY_API_KEY is Required" }),
});

export const config = configSchema.parse(process.env);
