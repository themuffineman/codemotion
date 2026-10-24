// The first webhook everyone writes. It works... until it doesn't.
import http from 'node:http';
import { sendReceiptEmail } from './work.js';

http
  .createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const event = JSON.parse(body);

    if (event.type === 'payment.succeeded') {
      await sendReceiptEmail(event.data.paymentId); // takes about 5 seconds
    }

    res.writeHead(200).end();
  })
  .listen(3000, () => console.log('[app] listening on :3000'));
