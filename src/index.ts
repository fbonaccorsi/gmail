import { google } from 'googleapis';

const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth });

async function runBot() {
  try {
    const res = await gmail.users.messages.list({ userId: 'me', q: 'label:Typescript' });
    if (!res.data.messages) return;

    for (const msg of res.data.messages) {
      const details = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      
      // Uniamo snippet e body per non perdere nulla
      let fullText = (details.data.snippet || "");
      if (details.data.payload?.parts) {
        details.data.payload.parts.forEach(p => {
          if (p.body?.data) fullText += " " + Buffer.from(p.body.data, 'base64').toString();
        });
      } else if (details.data.payload?.body?.data) {
        fullText += " " + Buffer.from(details.data.payload.body.data, 'base64').toString();
      }

      // PULIZIA: Rimuoviamo i tag HTML per evitare interferenze
      const cleanText = fullText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

      // 1. OSPITI: Cerca il numero che precede "adulti" o "ospiti"
      const ospiti = cleanText.match(/(\d+)\s*(?:adulti|ospiti|ospite)/i)?.[1] || "N/D";
      
      // 2. NOTTI: Cerca il numero che precede "notti"
      const notti = cleanText.match(/(\d+)\s*notti/i)?.[1] || "N/D";
      
      // 3. GUADAGNO: Cerca la cifra dopo "TOTALE (EUR)" o "Compenso" o il simbolo €
      // Questa regex è più forte: cerca un numero con virgola o punto preceduto da EUR o €
      const guadagno = cleanText.match(/(?:TOTALE \(EUR\)|Compenso|EUR|€)\s*([\d,.]+)/i)?.[1] || "0,00";
      
      // 4. PULIZIA: Cerca specificamente la riga delle pulizie
      const pulizia = cleanText.match(/(?:pulizia)\s*€?\s*([\d,.]+)/i)?.[1] || "0,00";

      // 5. DATA ARRIVO
      const arrivo = cleanText.match(/(?:arrivo|check-in)\s*([0-9]{1,2}\s*[a-z]{3})/i)?.[1] || "Data_N_D";

      const fileName = `Airbnb_${arrivo.replace(/\s/g, '_')}.md`;
      const fileContent = `---
tag: prenotazioni/airbnb
---
# 🏠 Dettaglio Prenotazione
- **Check-in**: ${arrivo}
- **Notti**: ${notti}
- **Ospiti**: ${ospiti}

## 💰 Dati Economici
- **Guadagno Host**: €${guadagno}
- **Spese Pulizia**: €${pulizia}

---
[Link Mail](https://mail.google.com/mail/u/0/#inbox/${msg.id})`;

      console.log(`\n--- COPIA IL FILE: ${fileName} ---`);
      console.log(fileContent);
      console.log(`--- FINE ---`);
    }
  } catch (e) { console.error("Errore:", e); }
}
runBot();
