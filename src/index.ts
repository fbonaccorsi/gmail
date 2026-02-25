import { google } from 'googleapis';

const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth });

async function runBot() {
  try {
    const res = await gmail.users.messages.list({ userId: 'me', q: 'label:Typescript' });
    if (!res.data.messages) return;

    for (const msg of res.data.messages) {
      const details = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
      
      // 1. RECUPERO TESTO: Cerchiamo la parte 'text/plain' che è la più pulita
      let body = "";
      const part = details.data.payload?.parts?.find(p => p.mimeType === 'text/plain');
      if (part?.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString();
      } else {
        body = details.data.snippet || "";
      }

      // 2. ANALISI SEQUENZIALE (Come richiesto)
      
      // DATE: Airbnb spesso scrive "Arrivo: GIO, 29 AGO". Cerchiamo il pattern Giorno + Mese.
      const allDates = body.match(/(\d{1,2}\s+[a-z]{3})/gi) || [];
      // Filtriamo via i numeri sospetti (come codici tracking da 2 cifre)
      const validDates = allDates.filter(d => !d.includes("NUO") && !d.includes("77"));
      const arrivo = validDates[0] || "N/D";
      const partenza = validDates[1] || "N/D";

      // OSPITI: Cerchiamo la parola "adulti" o "ospiti" e prendiamo il numero precedente
      const ospitiMatch = body.match(/(\d+)\s+(?:adulti|ospiti|ospite)/i);
      const ospiti = ospitiMatch ? ospitiMatch[1] : "N/D";

      // FINANZE: Cerchiamo le cifre con la virgola (es. 299,63) vicino alle parole chiave
      const findMoney = (keyword: string) => {
        const regex = new RegExp(`${keyword}[\\s\\S]{0,50}([\\d]{1,3}(?:[.,]\\d{2})?)`, 'i');
        const match = body.match(regex);
        return match ? match[1] : "0,00";
      };

      const costiStanza = findMoney("Costi della stanza");
      const pulizia = findMoney("Costi di pulizia");
      const guadagnoNetto = findMoney("Tu guadagni");
      const notti = body.match(/(\d+)\s+notti/i)?.[1] || "N/D";

      // 3. GENERAZIONE FILE MARKDOWN
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
[Link Mail](https://mail.google.com/mail/u/0/#inbox/${msg.id})`;

      console.log(`\n--- INIZIO FILE: ${fileName} ---`);
      console.log(fileContent);
      console.log(`--- FINE ---`);
    }
  } catch (e) { console.error("Errore:", e); }
}
runBot();
