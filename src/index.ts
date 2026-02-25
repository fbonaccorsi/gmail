import { google } from 'googleapis';

// Configurazione dalle variabili d'ambiente (GitHub Secrets)
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth });

async function runBot() {
  try {
    console.log('Avvio scansione email...');

    // 1. Cerca le email con l'etichetta "Typescript"
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'label:Typescript', 
    });

    if (!res.data.messages || res.data.messages.length === 0) {
      console.log('Nessuna email trovata con questa etichetta.');
      return;
    }

    for (const msg of res.data.messages) {
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
      });

      const snippet = details.data.snippet || "";
      const body = details.data.payload?.body?.data 
        ? Buffer.from(details.data.payload.body.data, 'base64').toString() 
        : snippet;

      // 2. Estrazione dati con Regex (Formato Airbnb)
      const dataArrivo = body.match(/(\d{1,2}\s\w+\s\d{4})/)?.[0] || "Data non trovata";
      const numeroOspiti = body.match(/(\d+)\sospit/)?.[1] || "N/A";
      const guadagno = body.match(/Guadagno totale:\s€?([\d,.]+)/)?.[1] || "0,00";
      const pulizia = body.match(/pulizia:\s€?([\d,.]+)/)?.[1] || "0,00";

      // 3. Formattazione per Obsidian
      const dataOggi = new Date().toISOString().split('T')[0];
      
      console.log('--- COPIA DA QUI PER OBSIDIAN ---');
      console.log(`## Prenotazione Airbnb - ${dataArrivo}`);
      console.log(`- **Data Estrazione**: ${dataOggi}`);
      console.log(`- **Check-in**: ${dataArrivo}`);
      console.log(`- **Ospiti**: ${numeroOspiti}`);
      console.log(`- **Guadagno Netto**: €${guadagno}`);
      console.log(`- **Spese Pulizia**: €${pulizia}`);
      console.log(`- **Link ID**: https://mail.google.com/mail/u/0/#inbox/${msg.id}`);
      console.log('--- FINE NOTA ---');
    }

  } catch (error) {
    console.error('Errore durante l\'esecuzione:', error);
  }
}

runBot();
