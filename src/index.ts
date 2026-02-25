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
      const fullText = details.data.snippet + " " + (details.data.payload?.body?.data ? Buffer.from(details.data.payload.body.data, 'base64').toString() : "");

      // Estrazione mirata sul formato dell'email di Lori 
      const ospiteNome = fullText.match(/ARRIVERÀ IL (.*?)\./i)?.[1] || "Ospite";
      const checkIn = fullText.match(/(?:GIO|VEN|SAB|DOM|LUN|MAR|MER)\s(\d{1,2}\s[A-Z]{3})/i)?.[0] || "N/D";
      const checkOut = fullText.match(/Check-out\s+.*?\s+(?:GIO|VEN|SAB|DOM|LUN|MAR|MER)\s(\d{1,2}\s[A-Z]{3})/i)?.[1] || "N/D";
      const ospiti = fullText.match(/OSPITI\s+(\d+)\sadulti/i)?.[1] || "N/D";
      
      // Dati Finanziari
      const prezzoNotte = fullText.match(/([\d,.]+)\s*€\sx\s\d+\s*notti/i)?.[1] || "0,00";
      const pulizia = fullText.match(/Costi di pulizia\s+([\d,.]+)/i)?.[1] || "0,00";
      const guadagnoHost = fullText.match(/COMPENSO DELL'HOST[\s\S]*?TOTALE \(EUR\)\s+([\d,.]+)/i)?.[1] || "0,00";

      const fileName = `Prenotazione_${ospiteNome}_${checkIn.replace(/\s/g, '_')}.md`;
      const fileContent = `---
tipo: soggiorno_airbnb
ospite: ${ospiteNome}
---
# 🏠 Prenotazione: ${ospiteNome}
- **Check-in**: ${checkIn}
- **Check-out**: ${checkOut}
- **Ospiti**: ${ospiti}

## 💶 Dati Economici
- **Prezzo a notte**: €${prezzoNotte}
- **Costi Pulizia**: €${pulizia}
- **Guadagno Netto Host**: €${guadagnoHost}

---
[Apri Email](https://mail.google.com/mail/u/0/#inbox/${msg.id})`;

      console.log(`\n--- COPIA IL TESTO SOTTO E SALVALO COME: ${fileName} ---`);
      console.log(fileContent);
      console.log(`--- FINE FILE ---\n`);
    }
  } catch (e) { console.error("Errore:", e); }
}
runBot();
