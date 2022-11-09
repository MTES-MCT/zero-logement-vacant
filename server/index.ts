import express from 'express';
import path from 'path';
import protectedRouter from './routers/protected';
import unprotectedRouter from './routers/unprotected';
import config from './utils/config';

import cors from 'cors';
import sentry from './utils/sentry';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import fileUpload from 'express-fileupload';
import errorHandler from "./middlewares/error-handler";

const PORT = config.serverPort || 3001;

const app = express();

app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://stats.data.gouv.fr',
                'https://client.crisp.chat'
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css',
                'https://client.crisp.chat/static/stylesheets/client_default.css'
            ],
            imgSrc: [
                "'self'",
                'https://image.crisp.chat',
                'https://client.crisp.chat',
                'data:'
            ],
            fontSrc: [
                "'self'",
                'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.woff',
                'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.woff2',
                'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.ttf',
                'https://client.crisp.chat',
                'data:'
            ],
            objectSrc: ["'self'"],
            mediaSrc: ["'self'"],
            connectSrc: [
                "'self'",
                'https://stats.data.gouv.fr',
                'wss://client.relay.crisp.chat',
                'https://client.crisp.chat'
            ]
        },
    }
}));

if (config.environment === 'development') {
    app.use(cors({ origin: 'http://localhost:3000' }));
}

app.use(fileUpload());
app.use(express.json());

const rateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes window
    max: parseInt(config.maxRate ?? '10000'), // start blocking after X requests for windowMs time
    message: 'Too many request from this address, try again later please.',
});
app.use(rateLimiter);

app.use(unprotectedRouter);
app.use(protectedRouter);

app.use(errorHandler());

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
