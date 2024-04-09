import nodemailer from 'nodemailer';
import { getMockFor } from 'nodemailer-mock';

const mock = getMockFor(nodemailer);

export default mock;
