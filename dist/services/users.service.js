"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = __importDefault(require("../models/user.model"));
const findByEmail = async (email) => {
    return user_model_1.default.findOne({ email });
};
const createUser = async (user) => {
    return user_model_1.default.create(user);
};
exports.default = { findByEmail, createUser };
//# sourceMappingURL=users.service.js.map