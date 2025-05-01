import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

import { config } from "../config.ts";
import type { TokenResponseSchema } from "../schemas/users.schema.ts";

declare global {
  namespace Express {
    // noinspection JSUnusedGlobalSymbols
    interface Request {
      user: {
        userId: string;
        email: string;
      };
    }
  }
}

export function verifyToken(
  req: Request,
  res: Response<TokenResponseSchema>,
  next: NextFunction,
) {
  const token = req.cookies["auth_token"] as string;
  if (!token) {
    res.status(401).json({
      success: false,
      message: "No token provided",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.SECRET_KEY);

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: "Invalid token provided",
      });
      return;
    }

    const payload = decoded as JwtPayload;

    req.user = payload.user;
  } catch (e) {
    console.log({ error: e });
    res.status(401).json({
      success: false,
      message: "Unable to validate token",
    });
  } finally {
    next();
  }
}
