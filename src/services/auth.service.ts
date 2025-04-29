import jwt from "jsonwebtoken";
import { config } from "../config.ts";

const createAuthenticationToken = async (user: {
  userId: string;
  email: string;
}) => {
  return jwt.sign({ user }, config.SECRET_KEY, { expiresIn: "1d" });
};

export default { createAuthenticationToken };
