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
      
      // 1. Prendi l'Oggetto della mail
      const subject = details.data.payload?.headers?.find(h => h.name === 'Subject')?.value || "Senza Oggetto";
      
      // 2. Prendi il testo (snippet) e prova a decodificare il corpo se esiste
      let bodyText = details.data.snippet || "";
      
      // Tentativo di recuperare il testo piano se disponibile, altrimenti resta lo snippet
      const part = details.data.payload?.parts?.find(p => p.mimeType === 'text/plain');
      if (part?.body?.data) {
        bodyText = Buffer.from(part.body.data, 'base64').toString();
      }

      // 3. Formattazione pulita per Obsidian
      const fileName = `Mail_${msg.id}.md`;
      const fileContent = `---
tag: mail/importate
id: ${msg.id}
---
# ✉️ ${subject}

## Contenuto della Mail:
${bodyText}

---
[Apri su Gmail](https://mail.google.com/mail/u/0/#inbox/${msg.id})`;

      console.log(`\n--- INIZIO NOTA: ${fileName} ---`);
      console.log(fileContent);
      console.log(`--- FINE NOTA ---\n`);
    }
  } catch (e) { 
    console.error("Errore nel bot:", e); 
  }
}
runBot();
