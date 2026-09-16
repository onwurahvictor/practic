// Sends the "new enquiry" notification email via Resend (https://resend.com).
// Failure here should never block saving the enquiry to the database —
// the caller wraps this in its own try/catch and just logs on failure.
async function sendEnquiryEmail({ name, business, email, phone, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) {
    throw new Error('RESEND_API_KEY or NOTIFY_EMAIL is not set');
  }

  const from = process.env.NOTIFY_FROM || 'Practic Concerns <onboarding@resend.dev>';

  const escape = (s) => String(s || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

  const html = `
    <h2>New work order</h2>
    <p><strong>Name:</strong> ${escape(name)}</p>
    ${business ? `<p><strong>Business:</strong> ${escape(business)}</p>` : ''}
    <p><strong>Email:</strong> ${escape(email)}</p>
    ${phone ? `<p><strong>Phone:</strong> ${escape(phone)}</p>` : ''}
    <p><strong>Message:</strong></p>
    <p>${escape(message).replace(/\n/g, '<br>')}</p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: `New work order from ${name}${business ? ` (${business})` : ''}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API responded ${res.status}: ${body}`);
  }
}

module.exports = { sendEnquiryEmail };
