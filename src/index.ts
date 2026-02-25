import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth });

async function runBot() {
  try {
    const res = await gmail.users.messages.list({ userId: 'me', q: 'label:Typescript' });
    if (!res.data.messages) return console.log('Nessuna mail.');

    for (const msg of res.data.messages) {
      const details = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      
      // Funzione per estrarre tutto il testo possibile dalla mail
      let fullText = details.data.snippet || "";
      const parts = details.data.payload?.parts || [];
      parts.forEach(p => {
        if (p.body?.data) fullText += Buffer.from(p.body.data, 'base64').toString();
      });

      // Estrazione migliorata (Regex più flessibili)
      const checkIn = fullText.match(/(?:Check-in|Arrivo)[:\s]+([A-Z]{3}\s\d{1,2}|[\d\/]+)/i)?.[1] || "Senza_Data";
      const ospiti = fullText.match(/(\d+)\s(?:ospiti|adulti)/i)?.[1] || "1";
      const totale = fullText.match(/(?:Totale|Compenso|EUR|€)\s*([\d,.]+)/i)?.[1] || "0,00";

      const fileContent = `---
tag: prenotazioni/airbnb
---
# Prenotazione Airbnb: ${checkIn}
- **Ospiti**: ${ospiti}
- **Totale**: €${totale}
- [Vedi Mail](https://mail.google.com/mail/u/0/#inbox/${msg.id})`;

      // STAMPA IL CONTENUTO (Così lo vedi nel log)
      console.log(`FILE_NAME: Prenotazione_${checkIn.replace(/\s/g, '_')}.md`);
      console.log(fileContent);
    }
  } catch (e) { console.error(e); }
}
runBot();
