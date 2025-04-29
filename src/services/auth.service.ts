import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config.ts";

const createAuthenticationToken = async (user: {
  userId: string;
  email: string;
}) => {
  return jwt.sign({ user }, config.SECRET_KEY, { expiresIn: "1d" });
};

const passwordCompare = (password: string, pwdHash: string) =>
  bcrypt.compareSync(password, pwdHash);

export default { createAuthenticationToken, passwordCompare };
