// Polling: keep asking "is it done yet?" until the answer is yes.
const API = 'http://localhost:4000';

const payment = await (await fetch(`${API}/payments`, { method: 'POST' })).json();
console.log(`created ${payment.id}`);

let requests = 0;
while (true) {
  requests++;
  const { status } = await (await fetch(`${API}/payments/${payment.id}`)).json();
  console.log(`request ${requests}: ${status}`);
  if (status === 'succeeded') break;
  await new Promise((r) => setTimeout(r, 1000)); // wait a second, then ask again
}

console.log(`done after ${requests} requests, ${requests - 1} of them wasted`);
