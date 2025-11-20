declare namespace Express {
    interface Request {
        correlationId: string;
        user: {
            userId: string;
            email: string;
        };
    }
}
