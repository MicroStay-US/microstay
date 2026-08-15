const dotenv = require('dotenv');
const path = require('path');

async function testSecret(secret, label) {
  console.log(`\nTesting reCAPTCHA key for [${label}]:`);
  console.log(`Secret: ${secret ? secret.substring(0, 12) + '...' : 'undefined'}`);
  
  if (!secret) {
    console.log('❌ Secret key is not defined.');
    return;
  }

  const url = 'https://www.google.com/recaptcha/api/siteverify';
  const body = new URLSearchParams();
  body.append('secret', secret);
  body.append('response', 'dummy_token_for_testing');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      console.log(`❌ Google API returned status: ${res.status}`);
      return;
    }

    const data = await res.json();
    console.log('Response from Google siteverify:', JSON.stringify(data, null, 2));

    if (data['error-codes'] && data['error-codes'].includes('invalid-input-secret')) {
      console.log('❌ Google reports: Secret key is INVALID (invalid-input-secret).');
    } else if (data['error-codes'] && data['error-codes'].includes('invalid-input-response')) {
      console.log('✅ Secret key is VALID! (Only the dummy token was rejected as expected).');
    } else {
      console.log('ℹ️ Got response without specific code. Standard invalid response:', data.success === false);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function run() {
  // 1. Test .env.local
  dotenv.config({ path: path.join(__dirname, '../.env.local') });
  const localSecret = process.env.RECAPTCHA_SECRET_KEY;
  await testSecret(localSecret, '.env.local');

  // Reset env
  delete process.env.RECAPTCHA_SECRET_KEY;

  // 2. Test .env.test.example / .env.test.local
  dotenv.config({ path: path.join(__dirname, '../.env.test.example') });
  const testSecretVal = process.env.RECAPTCHA_SECRET_KEY;
  await testSecret(testSecretVal, '.env.test.example');
}

run();
