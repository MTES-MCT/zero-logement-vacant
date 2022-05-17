import express from 'express';
import path from 'path';
import protectedRouter from './routers/protected';
import unprotectedRouter from './routers/unprotected';
import config from './utils/config';

import cors from 'cors';
import sentry from './utils/sentry';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const PORT = config.serverPort || 3001;

const app = express();

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'", 'https://ourDomain.us.auth0.com/oauth/token', 'https://ourDomain.azure-api.net/fields/request/paths/invoke'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            objectSrc: ["'self'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "ourDomain.us.auth0.com"],
        },
    }
}));

if (config.environment === 'development') {
    app.use(cors({ origin: 'http://localhost:3000' }));
}

app.use(express.json());

const rateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes window
    max: parseInt(config.maxRate ?? '10000'), // start blocking after X requests for windowMs time
    message: 'Too many request from this address, try again later please.',
});
app.use(rateLimiter);

app.use(unprotectedRouter);
app.use(protectedRouter);

if (config.environment === 'production') {

    sentry.initCaptureConsoleWithHandler(app);

    app.use(express.static(path.join(__dirname, '../../frontend/build')));
    app.get('*', function (req: any, res: { sendFile: (arg0: any) => void; }) {
        res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
