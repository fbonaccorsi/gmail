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
      
      // Pulizia totale e normalizzazione degli spazi
      const clean = fullText.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

      // 1. DATE (Arrivo e Partenza)
      // Cerchiamo le date espresse come "numero + 3 lettere mese" (es: 29 ago, 31 ago)
      const dateMatches = clean.match(/(\d{1,2}\s+[a-z]{3})/gi) || [];
      const arrivo = dateMatches[0] || "N/D";
      const partenza = dateMatches[1] || "N/D";

      // 2. OSPITI E NOTTI
      // Usiamo una logica più flessibile per saltare eventuali numeri di tracking
      const ospiti = clean.match(/(\d+)\s*(?:adulti|ospiti|ospite)/i)?.[1] || "N/D";
      const notti = clean.match(/(\d+)\s*notti/i)?.[1] || "N/D";

      // 3. DATI FINANZIARI (Logica a "prossimità")
      // Cerchiamo il numero che segue immediatamente i tuoi termini chiave
      const extractMoney = (key: string) => {
        const regex = new RegExp(`${key}.*?(\\d+[\\d,.]*)`, 'i');
        const match = clean.match(regex);
        return match ? match[1] : "0,00";
      };

      const costiStanza = extractMoney("Costi della stanza");
      const pulizia = extractMoney("Costi di pulizia");
      const guadagnoNetto = extractMoney("Tu guadagni");

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
