import dotenv from 'dotenv';
import path from 'path';

if (!process.env.API_PORT) {
    dotenv.config({path: path.join(__dirname, '../../.env')});
}

export default {
    environment: process.env.NODE_ENV || 'development',
    serverPort: process.env.API_PORT,
    airTable: {
        apiKey: process.env.AIRTABLE_API_KEY,
        base: process.env.AIRTABLE_BASE
    },
    auth: {
        secret: process.env.AUTH_SECRET || 'secret'
    },
    databaseUrl: process.env.DATABASE_URL,
    databaseUrlTest: process.env.DATABASE_URL_TEST,
    sentryDNS: process.env.SENTRY_DNS
};
