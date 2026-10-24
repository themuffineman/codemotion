// A fake payment provider, so the demo runs without any accounts.
// It works like Stripe: you create a payment, it finishes a few seconds later,
// and if you gave it a webhook URL, it POSTs a signed event there
// (and retries if you're slow).
import http from 'node:http';
import crypto from 'node:crypto';

const SECRET = 'whsec_demo_secret';
const WEBHOOK_URL = process.env.WEBHOOK_URL; // e.g. http://localhost:3000/webhooks
// send every event twice, like real providers sometimes do
const DUPLICATE = process.env.DUPLICATE === '1';
const payments = new Map();

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

// Sign "timestamp.body" with the shared secret (the same idea as Stripe's signature header)
function sign(body) {
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

// POST the event to your app. No 2xx within 3 seconds counts as a failure, and gets retried.
async function deliver(event, attempt = 1) {
  const body = JSON.stringify(event);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'payly-signature': sign(body) },
      body,
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    console.log(`[provider] ${event.id} delivered (attempt ${attempt})`);
  } catch (err) {
    console.log(`[provider] ${event.id} failed (attempt ${attempt}): ${err.message}`);
    if (attempt < 4) setTimeout(() => deliver(event, attempt + 1), 2000 * attempt);
  }
}

function completePayment(id) {
  payments.get(id).status = 'succeeded';
  console.log(`[provider] ${id} succeeded`);
  if (!WEBHOOK_URL) return;

  const event = {
    id: 'evt_' + crypto.randomBytes(4).toString('hex'),
    type: 'payment.succeeded',
    data: { paymentId: id },
  };
  deliver(event);
  if (DUPLICATE) setTimeout(() => deliver(event), 1000);
}

http
  .createServer((req, res) => {
    // Create a payment. The "bank" takes 6 seconds to say yes.
    if (req.method === 'POST' && req.url === '/payments') {
      const id = 'pay_' + crypto.randomBytes(4).toString('hex');
      payments.set(id, { id, status: 'pending' });
      setTimeout(() => completePayment(id), 6000);
      return send(res, 201, payments.get(id));
    }

    // Check on a payment
    const match = req.url.match(/^\/payments\/(\w+)$/);
    if (req.method === 'GET' && match && payments.has(match[1])) {
      return send(res, 200, payments.get(match[1]));
    }

    send(res, 404, { error: 'not found' });
  })
  .listen(4000, () => console.log('[provider] listening on :4000'));
