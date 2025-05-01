import express, {
  type Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import {
  loginSchema,
  type LoginResponse,
  type LoginSchema,
} from "../schemas/auth.schema";
import { parseZodError } from "../utils/parse-zod-error";
import usersService from "../services/users.service";
import authService from "../services/auth.service";
import { config } from "../config";

const router: Router = express.Router();

const loginPayloadValidatorMiddleware = async (
  req: Request<{}, {}, LoginSchema>,
  res: Response<LoginResponse>,
  next: NextFunction,
) => {
  const validated = await loginSchema.safeParseAsync(req.body);
  if (!validated.success) {
    res.status(400).json({
      success: false,
      message: "Failed to login",
      error: parseZodError(validated.error),
    });

    return;
  }

  next();
};

router.post(
  "/login",
  loginPayloadValidatorMiddleware,
  async (req: Request<{}, {}, LoginSchema>, res: Response<LoginResponse>) => {
    const { email, password } = req.body;

    try {
      const user = await usersService.findByEmail(email);

      if (!user) {
        res.status(400).json({
          success: false,
          message: "invalid credentials",
        });
        return;
      }

      const passwordsMatch = authService.passwordCompare(
        password,
        user.password,
      );

      if (!passwordsMatch) {
        res.status(400).json({
          success: false,
          message: "invalid credentials",
        });
        return;
      }

      const token = await authService.createAuthenticationToken({
        userId: user._id.toString(),
        email: user.email,
      });

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: "Login Success",
        data: {
          token,
        },
      });
    } catch (e) {
      console.log({ error: e });

      res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again later",
      });
    }
  },
);

router.post("/logout", async (_req: Request, res: Response) => {
  res.cookie("auth_token", "", {
    expires: new Date(0),
  });

  res.sendStatus(200);
  return;
});

export default router;
