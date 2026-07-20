/* PoleProof audit intake handler — same-origin (Vercel Edge), CSP-friendly.
 * Receives the intake form (fields + files) and emails it to the intake inbox
 * via Resend. Returns 503 when RESEND_API_KEY is not set, so the browser falls
 * back to the email-compose path.
 *
 * Vercel env vars to set:
 *   RESEND_API_KEY  (required to activate uploads)
 *   INTAKE_FROM     (optional, default "PoleProof Intake <intake@getpoleproof.com>";
 *                    must be on a Resend-verified domain/subdomain)
 *   INTAKE_TO       (optional, default "audit@getpoleproof.com")
 */
export const config = { runtime: 'edge' };

function toBase64(arrayBuffer) {
  var bytes = new Uint8Array(arrayBuffer);
  var binary = '';
  var chunk = 0x8000;
  for (var i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { 'content-type': 'application/json' }
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);

  var apiKey = (typeof process !== 'undefined' && process.env) ? process.env.RESEND_API_KEY : null;
  if (!apiKey) return json({ ok: false, reason: 'not_configured' }, 503);

  var form;
  try { form = await req.formData(); }
  catch (e) { return json({ ok: false, reason: 'bad_request' }, 400); }

  function get(k) { var v = form.get(k); return v == null ? '' : String(v).trim(); }
  var name = get('name');
  var company = get('company');
  var email = get('email');
  var owner = get('owner');
  var amount = get('amount');
  var stage = get('stage_label') || get('stage');
  var note = get('note');

  var attachments = [];
  var entries = form.entries();
  for (var pair = entries.next(); !pair.done; pair = entries.next()) {
    var value = pair.value[1];
    if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function' && value.size > 0) {
      var buf = await value.arrayBuffer();
      attachments.push({ filename: value.name || 'document', content: toBase64(buf) });
    }
  }

  var fileList = attachments.length
    ? attachments.map(function (a) { return '  - ' + a.filename; }).join('\n')
    : '  (none attached)';

  var text = [
    'New free audit request from the PoleProof intake form.',
    '',
    'Name: ' + name,
    'Company: ' + company,
    'Work email: ' + email,
    'Pole owner: ' + (owner || 'not provided'),
    'Approximate amount under review: ' + (amount || 'not provided'),
    'Type: ' + (stage || 'not provided'),
    '',
    'Mutual NDA: accepted via the intake form.',
    '',
    'Notes: ' + (note || 'none'),
    '',
    'Attached documents:',
    fileList
  ].join('\n');

  var payload = {
    from: (process.env.INTAKE_FROM || 'PoleProof Intake <intake@getpoleproof.com>'),
    to: [process.env.INTAKE_TO || 'audit@getpoleproof.com'],
    subject: 'Free audit request' + (company ? ' for ' + company : ''),
    text: text,
    attachments: attachments
  };
  if (email) payload.reply_to = email;

  var resp;
  try {
    resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return json({ ok: false, reason: 'send_error' }, 502);
  }

  if (!resp.ok) return json({ ok: false, reason: 'send_failed', status: resp.status }, 502);
  return json({ ok: true }, 200);
}
