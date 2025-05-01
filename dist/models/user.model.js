import bcrypt from "bcryptjs";
import { model, Schema } from "mongoose";
const userSchema = new Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
}, { timestamps: true });
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});
const User = model("User", userSchema);
export default User;
//# sourceMappingURL=user.model.js.map