import User from "../models/user.model";

import type { UserType } from "../models/user.model";
import type { CreateUserSchema } from "../schemas/users.schema";

const findByEmail = async (email: string): Promise<UserType | null> => {
  return User.findOne({ email });
};

const createUser = async (user: CreateUserSchema): Promise<UserType | null> => {
  return User.create(user);
};

export default { findByEmail, createUser };
