import type { Request, Response, NextFunction } from "express";
import type { TokenResponseSchema } from "../schemas/users.schema";
declare global {
    namespace Express {
        interface Request {
            user: {
                userId: string;
                email: string;
            };
        }
    }
}
export declare function verifyToken(req: Request, res: Response<TokenResponseSchema>, next: NextFunction): void;
