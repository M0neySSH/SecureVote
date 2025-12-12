const API_URL = 'http://127.0.0.1:3000/api';

async function testPersistence() {
    try {
        console.log("1. Checking initial state...");
        const initialRes = await fetch(`${API_URL}/voter/debug`);
        const initialData = await initialRes.json();
        console.log("Initial Voters:", initialData.voters.length);

        console.log("2. Registering voter...");
        const regRes = await fetch(`${API_URL}/voter/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: `persist${Date.now()}@test.com` })
        });
        const regData = await regRes.json();
        console.log("Registered:", regData);

        console.log("3. Checking state after registration...");
        const finalRes = await fetch(`${API_URL}/voter/debug`);
        const finalData = await finalRes.json();
        console.log("Final Voters:", finalData.voters.length);

        if (finalData.voters.length > initialData.voters.length) {
            console.log("✅ SUCCESS: Voter persisted in memory.");
        } else {
            console.error("❌ FAILURE: Voter NOT persisted.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

testPersistence();
