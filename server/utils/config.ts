export default {
    environment: process.env.ENVIRONMENT || 'development',
    serverPort: process.env.API_PORT,
    airTable: {
        apiKey: process.env.AIRTABLE_API_KEY,
        base: process.env.AIRTABLE_BASE
    }
};
