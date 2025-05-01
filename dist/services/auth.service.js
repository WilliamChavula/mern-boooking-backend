import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config";
const createAuthenticationToken = async (user) => {
    return jwt.sign({ user }, config.SECRET_KEY, { expiresIn: "1d" });
};
const passwordCompare = (password, pwdHash) => bcrypt.compareSync(password, pwdHash);
export default { createAuthenticationToken, passwordCompare };
//# sourceMappingURL=auth.service.js.map