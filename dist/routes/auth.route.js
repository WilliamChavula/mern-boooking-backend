"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_schema_1 = require("../schemas/auth.schema");
const parse_zod_error_1 = require("../utils/parse-zod-error");
const users_service_1 = __importDefault(require("../services/users.service"));
const auth_service_1 = __importDefault(require("../services/auth.service"));
const config_1 = require("../config");
const router = express_1.default.Router();
const loginPayloadValidatorMiddleware = async (req, res, next) => {
    const validated = await auth_schema_1.loginSchema.safeParseAsync(req.body);
    if (!validated.success) {
        res.status(400).json({
            success: false,
            message: "Failed to login",
            error: (0, parse_zod_error_1.parseZodError)(validated.error),
        });
        return;
    }
    next();
};
router.post("/login", loginPayloadValidatorMiddleware, async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await users_service_1.default.findByEmail(email);
        if (!user) {
            res.status(400).json({
                success: false,
                message: "invalid credentials",
            });
            return;
        }
        const passwordsMatch = auth_service_1.default.passwordCompare(password, user.password);
        if (!passwordsMatch) {
            res.status(400).json({
                success: false,
                message: "invalid credentials",
            });
            return;
        }
        const token = await auth_service_1.default.createAuthenticationToken({
            userId: user._id.toString(),
            email: user.email,
        });
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: config_1.config.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000,
        });
        res.status(200).json({
            success: true,
            message: "Login Success",
            data: {
                token,
            },
        });
    }
    catch (e) {
        console.log({ error: e });
        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again later",
        });
    }
});
router.post("/logout", async (_req, res) => {
    res.cookie("auth_token", "", {
        expires: new Date(0),
    });
    res.sendStatus(200);
    return;
});
exports.default = router;
//# sourceMappingURL=auth.route.js.map