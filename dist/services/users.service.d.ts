import type { UserType } from "../models/user.model";
import type { CreateUserSchema } from "../schemas/users.schema";
declare const _default: {
    findByEmail: (email: string) => Promise<UserType | null>;
    createUser: (user: CreateUserSchema) => Promise<UserType | null>;
};
export default _default;
