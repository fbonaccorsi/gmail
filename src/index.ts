import { google } from 'googleapis';

const LABEL_IN = 'Typescript';
const LABEL_OUT = 'Typescript processato';

async function main() {
const auth = new google.auth.OAuth2(
process.env.GMAIL_CLIENT_ID,
process.env.GMAIL_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth });

}
main();