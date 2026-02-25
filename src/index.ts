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
      let fullText = (details.data.snippet || "");
      if (details.data.payload?.parts) {
        details.data.payload.parts.forEach(p => {
          if (p.body?.data) fullText += " " + Buffer.from(p.body.data, 'base64').toString();
        });
      }
      
      // Pulizia testo
      const clean = fullText.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

      // 1. TU GUADAGNI (Il valore netto finale)
      const guadagnoNetto = clean.match(/Tu\s*guadagni\s*([\d,.]+)/i)?.[1] || "0,00";

      // 2. COSTI STANZA (Il lordo prima delle tasse/pulizie)
      const costiStanza = clean.match(/Costi\s*della\s*stanza.*?\s*([\d,.]+)/i)?.[1] || "0,00";

      // 3. PULIZIA
      const pulizia = clean.match(/Costi\s*di\s*pulizia\s*([\d,.]+)/i)?.[1] || "0,00";

      // 4. DATE E NOTTI (Migliorate per evitare codici strani)
      const arrivo = clean.match(/Arrivo\s*([0-9]{1,2}\s*[a-z]{3})/i)?.[1] || "N/D";
      const partenza = clean.match(/Partenza\s*([0-9]{1,2}\s*[a-z]{3})/i)?.[1] || "N/D";
      const notti = clean.match(/(\d+)\s*notti/i)?.[1] || "N/D";
      const ospiti = clean.match(/(\d+)\s*(?:adulti|ospiti)/i)?.[1] || "N/D";

      const fileName = `Airbnb_${arrivo.replace(/\s/g, '_')}.md`;
      const fileContent = `---
tag: prenotazioni/airbnb
---
# 🏠 Prenotazione Airbnb: ${arrivo}
- **Arrivo**: ${arrivo}
- **Partenza**: ${partenza}
- **Notti**: ${notti}
- **Ospiti**: ${ospiti}

## 💰 Dettaglio Economico
- **Costi Stanza (Lordo)**: €${costiStanza}
- **Spese Pulizia**: €${pulizia}
- **TU GUADAGNI (Netto)**: €${guadagnoNetto}

---
*ID: ${msg.id}*`;

      console.log(`\n--- COPIA IL FILE: ${fileName} ---`);
      console.log(fileContent);
      console.log(`--- FINE ---`);
    }
  } catch (e) { console.error("Errore:", e); }
}
runBot();
