// The webhook done right: check it's real, answer fast,
// and never handle the same event twice.
import http from 'node:http';
import crypto from 'node:crypto';
import { sendReceiptEmail } from './work.js';

const SECRET = 'whsec_demo_secret'; // the provider gives you this; keep it in an env var
const processed = new Set(); // event ids already handled (a database table in real life)
const queue = []; // events waiting to be worked on (a real job queue in real life)

// 1. Is it really from the provider? Sign the body ourselves and compare.
function isValid(body, header = '') {
  const { t, v1 } = Object.fromEntries(header.split(',').map((part) => part.split('=')));
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // older than 5 minutes

  const expected = crypto.createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex');
  if (v1.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}

http
  .createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk; // the raw body, exactly as it was signed

    if (!isValid(body, req.headers['payly-signature'])) {
      console.log('[app] rejected: bad signature');
      return res.writeHead(400).end();
    }

    // 2. Answer right away, do the slow work after
    queue.push(JSON.parse(body));
    res.writeHead(200).end();
  })
  .listen(3000, () => console.log('[app] listening on :3000'));

// A tiny background worker that takes events off the queue one by one
async function worker() {
  while (true) {
    const event = queue.shift();
    if (!event) {
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    // 3. Seen this event before? Skip it.
    if (processed.has(event.id)) {
      console.log(`[app] ${event.id} already handled, skipping`);
      continue;
    }
    processed.add(event.id);

    if (event.type === 'payment.succeeded') await sendReceiptEmail(event.data.paymentId);
  }
}
worker();
