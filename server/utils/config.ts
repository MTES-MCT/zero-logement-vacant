import convict from 'convict';
import formats from 'convict-format-with-validator';
import dotenv from 'dotenv';
import path from 'path';

convict.addFormats(formats)

convict.addFormat({
    name: 'strict-boolean',
    validate(val: any) {
        return typeof val === 'string' && val === 'true'
    },
    coerce: (val: string): boolean => val === 'true'
})


if (!process.env.API_PORT) {
    dotenv.config({path: path.join(__dirname, '../../.env')});
}

interface Config {
    environment: string
    serverPort: number
    auth: {
        secret: string
        expiresIn: string
    }
    databaseUrl: string
    databaseUrlTest: string
    features: {
        enableTestAccounts: boolean
    }
    sentryDNS: string | null
    maxRate: number
    application: {
        host: string
    }
    mailer: {
        host: string | null
        port: number | null
        user: string | null
        password: string | null
        secure: boolean
    }
    mail: {
        from: string
    }
    cerema: {
        api: {
            endpoint: string
            authToken: string
        }
    },
    ban: {
        api: {
            endpoint: string
        }
    }
}

const config = convict<Config>({
    environment: {
        env: 'NODE_ENV',
        format: String,
        default: 'development'
    },
    serverPort: {
        env: 'API_PORT',
        format: 'port',
        default: 3001,
    },
    auth: {
        secret: {
            env: 'AUTH_SECRET',
            format: String,
            sensitive: true,
            default: null
        },
        expiresIn: {
            env: 'AUTH_EXPIRES_IN',
            format: String,
            default: '12 hours'
        },
    },
    databaseUrl: {
        env: 'DATABASE_URL',
        format: String,
        default: null
    },
    databaseUrlTest: {
        env: 'DATABASE_URL_TEST',
        format: String,
        default: null
    },
    features: {
        enableTestAccounts: {
            env: 'ENABLE_TEST_ACCOUNTS',
            format: 'strict-boolean',
            default: process.env.NODE_ENV !== 'production'
        }
    },
    sentryDNS: {
        env: 'SENTRY_DNS',
        format: String,
        default: null,
        nullable: true
    },
    maxRate: {
        env: 'MAX_RATE',
        format: 'int',
        default: 10000
    },
    application: {
        host: {
            env: 'APPLICATION_HOST',
            format: 'url',
            default: 'http://localhost:3000'
        }
    },
    mailer: {
        host: {
            env: 'MAILER_HOST',
            format: String,
            default: null,
            nullable: true
        },
        port: {
            env: 'MAILER_PORT',
            format: 'port',
            default: null,
            nullable: true
        },
        user: {
            env: 'MAILER_USER',
            format: String,
            default: null,
            nullable: true,
        },
        password: {
            env: 'MAILER_PASSWORD',
            format: String,
            sensitive: true,
            default: null,
            nullable: true
        },
        secure: {
            env: 'MAILER_SECURE',
            format: Boolean,
            default: false
        },
    },
    mail: {
        from: {
            env: 'MAIL_FROM',
            format: String,
            default: 'contact@zerologementvacant.beta.gouv.fr'
        }
    },
    cerema: {
        api: {
            endpoint: {
                env: 'CEREMA_API_ENDPOINT',
                format: 'url',
                default: 'https://getdf.cerema.fr'
            },
            authToken: {
                env: 'CEREMA_API_AUTH_TOKEN',
                format: String,
                sensitive: true,
                default: null
            }
        }
    },
    ban: {
        api: {
            endpoint: {
                env: 'BAN_API_ENDPOINT',
                format: 'url',
                default: 'https://api-adresse.data.gouv.fr'
            }
        }
    }

})
  .validate({ allowed: 'strict' })
  .get()

export default config
