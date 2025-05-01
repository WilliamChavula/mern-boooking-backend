import User from "../models/user.model";
const findByEmail = async (email) => {
    return User.findOne({ email });
};
const createUser = async (user) => {
    return User.create(user);
};
export default { findByEmail, createUser };
//# sourceMappingURL=users.service.js.map