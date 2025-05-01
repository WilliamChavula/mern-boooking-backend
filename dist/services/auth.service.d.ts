declare const _default: {
    createAuthenticationToken: (user: {
        userId: string;
        email: string;
    }) => Promise<string>;
    passwordCompare: (password: string, pwdHash: string) => boolean;
};
export default _default;
