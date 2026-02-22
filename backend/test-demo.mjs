async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/schedule/demo-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: '00000000-0000-0000-0000-000000000000', timeZone: 'America/New_York' })
    });
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", text);
  } catch (err) {
    console.error(err);
  }
}
test();
