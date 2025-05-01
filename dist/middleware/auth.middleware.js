import jwt from "jsonwebtoken";
import { config } from "../config";
export function verifyToken(req, res, next) {
    const token = req.cookies["auth_token"];
    if (!token) {
        res.status(401).json({
            success: false,
            message: "No token provided",
        });
        return;
    }
    try {
        const decoded = jwt.verify(token, config.SECRET_KEY);
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