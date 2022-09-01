import dotenv from 'dotenv';
import path from 'path';

if (!process.env.API_PORT) {
    dotenv.config({path: path.join(__dirname, '../../.env')});
}

export default {
    environment: process.env.NODE_ENV || 'development',
    serverPort: process.env.API_PORT || 3001,
    auth: {
        secret: process.env.AUTH_SECRET,
        expiresIn: process.env.AUTH_EXPIRES_IN || '12 hours'
    },
    databaseUrl: process.env.DATABASE_URL,
    databaseUrlTest: process.env.DATABASE_URL_TEST,
    sentryDNS: process.env.SENTRY_DNS,
    maxRate: process.env.MAX_RATE,
    application: {
        host: process.env.APPLICATION_HOST || 'http://localhost:3000'
    },
    mailer: {
        host: process.env.MAILER_HOST,
        port: process.env.MAILER_PORT,
        user: process.env.MAILER_USER,
        password: process.env.MAILER_PASSWORD,
        secure: process.env.MAILER_SECURE || false
    },
    mail: {
        from: process.env.MAIL_FROM || 'contact@zerologementvacant.beta.gouv.fr/'
    }
};
