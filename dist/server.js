"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = require("mongoose");
const config_1 = require("./config");
const users_route_1 = __importDefault(require("./routes/users.route"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
// Initialize express app
const app = (0, express_1.default)();
exports.app = app;
const port = config_1.config.PORT;
// Middleware
app.use((0, cors_1.default)({
    origin: config_1.config.FRONTEND_URL,
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check route
app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running" });
});
app.use("/api/users", users_route_1.default);
app.use("/api/auth", auth_route_1.default);
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
        status: "error",
        message: "An unexpected error occurred",
    });
});
// Start the server
const startServer = async () => {
    try {
        // Connect to MongoDB if connection string is provided
        await (0, mongoose_1.connect)(config_1.config.MONGODB_URI);
        console.log("Connected to MongoDB");
        app.listen(port, (error) => {
            if (error) {
                console.log(error);
            }
            console.log(`Server running on port ${port}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};
exports.startServer = startServer;
//# sourceMappingURL=server.js.map