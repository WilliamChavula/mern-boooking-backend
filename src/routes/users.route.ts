import express, { type Request, type Response, type Router } from "express";

import usersService from "../services/users.service";
import authService from "../services/auth.service";

import { config } from "../config";
import {
  createUserSchema,
  type CreateUserResponseSchema,
  type CreateUserSchema,
  type TokenResponseSchema,
  UserResponseSchema,
} from "../schemas/users.schema";
import { parseZodError } from "../utils/parse-zod-error";
import { verifyToken } from "../middleware/auth.middleware";

const router: Router = express.Router();

router.post(
  "/register",
  async (
    req: Request<{}, {}, CreateUserSchema>,
    res: Response<CreateUserResponseSchema>,
  ) => {
    try {
      const validated = await createUserSchema.safeParseAsync(req.body);
      if (!validated.success) {
        const issues = parseZodError(validated.error);

        res.status(400).send({
          success: false,
          message: "Failed to create user",
          error: issues,
        });
        return;
      }
      const { email, firstName, lastName, password } = req.body;
      const user = await usersService.findByEmail(email);
      if (user) {
        res
          .status(409)
          .json({ success: false, message: "User already exists" });
        return;
      }

      const newUser = await usersService.createUser({
        email,
        firstName,
        lastName,
        password,
      });

      if (!newUser) {
        res
          .status(500)
          .json({ success: false, message: "Failed to create user" });
        return;
      }

      const token = await authService.createAuthenticationToken({
        userId: newUser._id.toString(),
        email,
      });

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
          id: newUser._id.toString(),
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
      });
      return;
    } catch (e) {
      console.log({ error: e });
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  },
);

router.get(
  "/validate-token",
  verifyToken,
  async (req: Request, res: Response<TokenResponseSchema>) => {
    res.status(200).json({
      success: true,
      message: "User validated successfully",
      data: req.user,
    });

    return;
  },
);

router.get(
  "/me",
  verifyToken,
  async (req: Request, res: Response<UserResponseSchema>) => {
    const userId = req.user.userId;

    const user = await usersService.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User found successfully",
      data: { ...user, _id: user._id.toString() },
    });

    try {
    } catch (e) {
      console.log("Error creating Hotels", e);
      res.status(500).json({
        success: false,
        message: "Something went wrong",
      });
    }
  },
);

export default router;
