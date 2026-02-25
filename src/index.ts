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
      
      // Estraiamo il testo e puliamolo da ogni simbolo strano o tag HTML
      let fullText = (details.data.snippet || "");
      if (details.data.payload?.parts) {
        details.data.payload.parts.forEach(p => {
          if (p.body?.data) fullText += " " + Buffer.from(p.body.data, 'base64').toString();
        });
      }
      // Pulizia estrema per facilitare la ricerca
      const clean = fullText.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

      // 1. DATA ARRIVO E PARTENZA (Cerca sequenze tipo "29 ago" o "31 ago")
      const dateTrovate = clean.match(/(\d{1,2}\s+[a-z]{3})/gi) || [];
      const arrivo = dateTrovate[0] || "Non trovata";
      const partenza = dateTrovate[1] || "Non trovata";

      // 2. COMPENSO HOST (Cerca la cifra dopo "COMPENSO DELL'HOST" o "TOTALE")
      // Cerchiamo un numero che abbia la virgola dopo parole chiave finanziarie
      const compensoMatch = clean.match(/(?:COMPENSO|TOTALE|PAGAMENTO).*?(\d+[\d,.]*)/i);
      const compenso = compensoMatch ? compensoMatch[1] : "0,00";

      // 3. PULIZIA
      const puliziaMatch = clean.match(/(?:pulizia).*?(\d+[\d,.]*)/i);
      const pulizia = puliziaMatch ? puliziaMatch[1] : "0,00";

      // 4. OSPITI E NOTTI
      const ospiti = clean.match(/(\d+)\s+(?:adulti|ospiti)/i)?.[1] || "N/D";
      const notti = clean.match(/(\d+)\s+notti/i)?.[1] || "N/D";

      const fileName = `Airbnb_${arrivo.replace(/\s/g, '_')}.md`;
      const fileContent = `---
tag: prenotazioni/airbnb
---
# 🏠 Prenotazione Airbnb
- **Arrivo**: ${arrivo}
- **Partenza**: ${partenza}
- **Notti**: ${notti}
- **Ospiti**: ${ospiti}

## 💰 Dettaglio Finanziario
- **Compenso Host**: €${compenso}
- **Costi Pulizia**: €${pulizia}

---
*ID Messaggio: ${msg.id}*`;

      console.log(`\n--- INIZIO FILE: ${fileName} ---`);
      console.log(fileContent);
      console.log(`--- FINE FILE ---\n`);
    }
  } catch (e) { console.error("Errore:", e); }
}
runBot();
