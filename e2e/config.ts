import convict from 'convict';

export interface Config {
  api: string;
  baseURL: string;
  email: string;
  password: string;
}

const config = convict<Config>({
  api: {
    env: 'CYPRESS_API',
    doc: 'The API URL',
    default: null,
    nullable: false
  },
  baseURL: {
    env: 'CYPRESS_BASE_URL',
    doc: 'The base URL of the application',
    default: null,
    nullable: false
  },
  email: {
    env: 'CYPRESS_EMAIL',
    doc: 'The email to use for authentication',
    default: null,
    sensitive: true,
    nullable: false
  },
  password: {
    env: 'CYPRESS_PASSWORD',
    doc: 'The password to use for authentication',
    default: null,
    sensitive: true,
    nullable: false
  }
});

export default config.get();
