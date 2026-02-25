import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth });

async function runBot() {
  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'label:Typescript', 
    });

    if (!res.data.messages) {
      console.log('Nessuna email trovata.');
      return;
    }

    for (const msg of res.data.messages) {
      const details = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      const body = details.data.snippet + " " + (details.data.payload?.body?.data || "");
      const decodedBody = Buffer.from(details.data.payload?.body?.data || "", 'base64').toString();
      const fullText = decodedBody + " " + details.data.snippet;

      // Estrazione dati mirata sull'email Airbnb di Clara
      const checkIn = fullText.match(/Check-in\s+([A-Z]{3}\s\d{1,2}\s[A-Z]{3})/i)?.[1] || "N/D";
      const checkOut = fullText.match(/Check-out\s+([A-Z]{3}\s\d{1,2}\s[A-Z]{3})/i)?.[1] || "N/D";
      const ospiti = fullText.match(/OSPITI\s+(\d+)\sadulti/i)?.[1] || "N/D";
      const compensoHost = fullText.match(/COMPENSO DELL'HOST[\s\S]*?TOTALE \(EUR\)\s+([\d,.]+)/i)?.[1] || "0,00";
      const pulizia = fullText.match(/Costi di pulizia\s+([\d,.]+)/i)?.[1] || "0,00";

      // Creazione contenuto file Markdown per Obsidian
      const fileName = `Prenotazione_Airbnb_${checkIn.replace(/\s/g, '_')}.md`;
      const fileContent = `---
tag: prenotazioni/airbnb
data_estrazione: ${new Date().toLocaleDateString()}
---
# 🏠 Prenotazione Airbnb: ${checkIn} - ${checkOut}

- **Ospiti**: ${ospiti} adulti 
- **Check-in**: ${checkIn} 
- **Check-out**: ${checkOut} 
- **Codice Conferma**: ${fullText.match(/CODICE DI CONFERMA\s+([A-Z0-9]+)/)?.[1] || "N/D"} 

## 💰 Dati Finanziari
- **Compenso Host**: €${compensoHost} 
- **Costi Pulizia**: €${pulizia} 

---
*Generato automaticamente da Gmail Bot*`;

      console.log(`\n--- INIZIO FILE: ${fileName} ---`);
      console.log(fileContent);
      console.log(`--- FINE FILE ---\n`);
    }
  } catch (e) { console.error(e); }
}
runBot();
