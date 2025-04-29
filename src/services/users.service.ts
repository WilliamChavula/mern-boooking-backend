import jwt from "jsonwebtoken";

import User from "../models/user.model.ts";
import { config } from "../config.ts";

import type { UserType } from "../models/user.model.ts";
import type { CreateUserSchema } from "../schemas/users.schema.ts";

const findByEmail = async (email: string): Promise<UserType | null> => {
  return User.findOne({ email });
};

const createUser = async (user: CreateUserSchema): Promise<UserType | null> => {
  return User.create(user);
};

const createAuthenticationToken = async (user: {
  userId: string;
  email: string;
}) => {
  return jwt.sign({ user }, config.SECRET_KEY, { expiresIn: "1d" });
};

export default { findByEmail, createUser, createAuthenticationToken };
