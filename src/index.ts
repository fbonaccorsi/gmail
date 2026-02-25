import { google } from 'googleapis';

const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth });

async function runBot() {
  try {
    const res = await gmail.users.messages.list({ userId: 'me', q: 'label:Typescript' });
    if (!res.data.messages) return console.log("Nessuna mail trovata.");

    for (const msg of res.data.messages) {
      const details = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      
      // Estraiamo il testo puro eliminando i tag HTML molesti
      let rawText = details.data.snippet || "";
      if (details.data.payload?.parts) {
        details.data.payload.parts.forEach(p => {
          if (p.mimeType === 'text/plain' && p.body?.data) {
            rawText += Buffer.from(p.body.data, 'base64').toString();
          }
        });
      }

      // 1. DATA DI ARRIVO (Cerca formati come "29 ago" o "29/08")
      const dataArrivo = rawText.match(/(?:Arrivo|Check-in)[:\s]+([0-9]{1,2}\s[a-z]{3}|[0-9]{2}\/[0-9]{2})/i)?.[1] || "Data_Non_Trovata";
      
      // 2. NUMERO NOTTI
      const notti = rawText.match(/(\d+)\s+notti/i)?.[1] || "1";
      
      // 3. OSPITI
      const ospiti = rawText.match(/(\d+)\s+(?:ospiti|adulti)/i)?.[1] || "1";
      
      // 4. DATI FINANZIARI (Cerca il simbolo € seguito da numeri)
      const guadagno = rawText.match(/(?:Compenso|Totale|EUR|€)\s*([\d,.]+)/i)?.[1] || "0,00";
      const pulizia = rawText.match(/(?:Pulizia)[:\s]+€?\s*([\d,.]+)/i)?.[1] || "0,00";

      const fileName = `Prenotazione_${dataArrivo.replace(/\s/g, '_')}.md`;
      const fileContent = `---
tag: prenotazioni/airbnb
---
# 🏠 Nuova Prenotazione
- **Check-in**: ${dataArrivo}
- **Notti**: ${notti}
- **Ospiti**: ${ospiti}

## 💰 Dettaglio Economico
- **Guadagno Host**: €${guadagno}
- **Spese Pulizia**: €${pulizia}

---
[Link Mail](https://mail.google.com/mail/u/0/#inbox/${msg.id})`;

      console.log(`\n--- COPIA QUESTO FILE: ${fileName} ---`);
      console.log(fileContent);
      console.log(`--- FINE FILE ---\n`);
    }
  } catch (e) { console.error("Errore critico:", e); }
}
runBot();
