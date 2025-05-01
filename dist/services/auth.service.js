"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = require("../config");
const createAuthenticationToken = async (user) => {
    return jsonwebtoken_1.default.sign({ user }, config_1.config.SECRET_KEY, { expiresIn: "1d" });
};
const passwordCompare = (password, pwdHash) => bcryptjs_1.default.compareSync(password, pwdHash);
exports.default = { createAuthenticationToken, passwordCompare };
//# sourceMappingURL=auth.service.js.map