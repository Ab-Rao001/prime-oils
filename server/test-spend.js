import fetch from 'node-fetch';

async function testSpend() {
  try {
    const res = await fetch('http://localhost:3005/api/campaigns/dummy/spend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: 100 }),
    });

    const data = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error(err);
  }
}

testSpend();
