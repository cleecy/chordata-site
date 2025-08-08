// /api/submit.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE, // ensure this name matches your Vercel env
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Parse x-www-form-urlencoded
    const data = await new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });

    const params = new URLSearchParams(data);
    const email = (params.get('email') || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).send('Invalid email');
    }

    const ip =
      (req.headers['x-forwarded-for'] || '')
        .toString()
        .split(',')[0]
        .trim() || null;

    const userAgent = req.headers['user-agent'] || null;

    const { error } = await supabase
      .from('submissions')
      .upsert({ email, ip, user_agent: userAgent }, { onConflict: 'email' });

    if (error) {
      console.error(error);
      return res.status(500).send('Database Error');
    }

    // Manual 303 redirect (works everywhere)
    res.statusCode = 303;
    res.setHeader('Location', '/thank-you.html');
    return res.end();

  } catch (err) {
    console.error(err);
    return res.status(500).send('Server Error');
  }
}
