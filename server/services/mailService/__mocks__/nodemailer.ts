import nodemailer from 'nodemailer';
import nodemailermock from 'nodemailer-mock';

const mock = nodemailermock.getMockFor(nodemailer);

export default mock;
