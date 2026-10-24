// Stand-in for the real work (sending an email, updating the database...). Slow on purpose.
export async function sendReceiptEmail(paymentId) {
  await new Promise((r) => setTimeout(r, 5000));
  console.log(`[app] receipt email sent for ${paymentId}`);
}
