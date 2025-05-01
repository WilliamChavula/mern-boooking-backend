"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function verifyToken(req, res, next) {
    const token = req.cookies["auth_token"];
    if (!token) {
        res.status(401).json({
            success: false,
            message: "No token provided",
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.SECRET_KEY);
        if (!decoded) {
            res.status(401).json({
                success: false,
                message: "Invalid token provided",
            });
            return;
        }
        const payload = decoded;
        req.user = payload.user;
    }
    catch (e) {
        console.log({ error: e });
        res.status(401).json({
            success: false,
            message: "Unable to validate token",
        });
    }
    finally {
        next();
    }
}
//# sourceMappingURL=auth.middleware.js.map