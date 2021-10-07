export default {
    environment: process.env.ENVIRONMENT || 'development',
    serverPort: process.env.API_PORT,
    airTable: {
        apiKey: process.env.AIRTABLE_API_KEY,
        base: process.env.AIRTABLE_BASE
    },
    auth: {
        email: process.env.AUTH_EMAIL || 'zlv@beta.gouv.fr',
        password: process.env.AUTH_PASSWORD || '$2y$10$6SpVXhNlNzXyuZai2AGvFOyjiTIAh59YYzxtGPfAUC6nCLABeOGLm',
        secret: process.env.AUTH_SECRET || 'secret'
    },
    databaseUrl: process.env.DATABASE_URL
};
