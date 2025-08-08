// /api/submit.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  {
    auth: { persistSession: false },
  }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Parse x-www-form-urlencoded (plain HTML form post)
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
      .insert({ email, ip, user_agent: userAgent });

    if (error) {
      // Handle duplicate email cleanly
      if (error.message && /duplicate key/i.test(error.message)) {
        return res.status(200).send('Already subscribed');
      }
      console.error(error);
      return res.status(500).send('Database Error');
    }

    // Redirect to thank-you page or return 200
    // return res.redirect(303, '/thank-you.html');
    return res.status(200).send('Success');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server Error');
  }
}