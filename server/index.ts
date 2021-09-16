import express from 'express';
import path from 'path';
import router from './routers';
import config from './utils/config';

import cors from 'cors';

const PORT = config.serverPort || 3001;

const app = express();

if (config.environment === 'development') {
    app.use(cors({ origin: 'http://localhost:3000' }));
}

app.use(express.json());

app.use(router);

if (config.environment === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'frontend/build')));
    app.get('*', function (req: any, res: { sendFile: (arg0: any) => void; }) {
        res.sendFile(path.join(__dirname, '..', 'frontend/build', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
