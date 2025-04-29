import express, { type Request, type Response, type Router } from "express";

import usersService from "../services/users.service.ts";

import { config } from "../config.ts";
import {
  createUserSchema,
  type CreateUserResponseSchema,
  type CreateUserSchema,
} from "../schemas/users.schema.ts";

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
        const issues = validated.error.errors.map((err) => ({
          message: err.message,
          path: err.path.map((p) => p.toString()),
        }));

        console.log({ issues });
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

      const token = usersService.createAuthenticationToken({
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

export default router;
