"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const users_service_1 = __importDefault(require("../services/users.service"));
const auth_service_1 = __importDefault(require("../services/auth.service"));
const config_1 = require("../config");
const users_schema_1 = require("../schemas/users.schema");
const parse_zod_error_1 = require("../utils/parse-zod-error");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/register", async (req, res) => {
    try {
        const validated = await users_schema_1.createUserSchema.safeParseAsync(req.body);
        if (!validated.success) {
            const issues = (0, parse_zod_error_1.parseZodError)(validated.error);
            res.status(400).send({
                success: false,
                message: "Failed to create user",
                error: issues,
            });
            return;
        }
        const { email, firstName, lastName, password } = req.body;
        const user = await users_service_1.default.findByEmail(email);
        if (user) {
            res
                .status(409)
                .json({ success: false, message: "User already exists" });
            return;
        }
        const newUser = await users_service_1.default.createUser({
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
        const token = await auth_service_1.default.createAuthenticationToken({
            userId: newUser._id.toString(),
            email,
        });
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: config_1.config.NODE_ENV === "production",
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
    }
    catch (e) {
        console.log({ error: e });
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
});
router.get("/validate-token", auth_middleware_1.verifyToken, async (req, res) => {
    res.status(200).json({
        success: true,
        message: "User validated successfully",
        data: req.user,
    });
    return;
});
exports.default = router;
//# sourceMappingURL=users.route.js.map