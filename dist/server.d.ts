import type { Express } from "express";
declare const app: Express;
declare const startServer: () => Promise<void>;
export { app, startServer };
