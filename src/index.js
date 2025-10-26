import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(express.json());

let accessToken = null;
let tokenExpiry = null;

// In-memory counters
let totalSubs = 0;       // baseline, you set this manually
let marathonSubs = 0;    // increments during the marathon

// Helper: get Twitch OAuth token
async function getAccessToken() {
  if (accessToken && dayjs().isBefore(tokenExpiry)) {
    return accessToken;
  }

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials"
    })
  });

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = dayjs().add(data.expires_in, "second");
  return accessToken;
}

// Helper: call Twitch API
async function twitchAPI(endpoint) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.twitch.tv/helix/${endpoint}`, {
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      "Authorization": `Bearer ${token}`
    }
  });

  const data = await res.json();
  console.log(`Twitch API response for ${endpoint}:`, data); // 👈 this logs the full response
  return data;
}


// Stats endpoint
app.get("/stats", async (req, res) => {
  try {
    const userId = process.env.TWITCH_USER_ID;

    // Followers
    const followersData = await twitchAPI(`users/follows?to_id=${userId}`);
    console.log("Followers API response:", followersData); // 👈 this line is new
    const followers = followersData.total || 0;

    // Stream uptime
    const streamData = await twitchAPI(`streams?user_id=${userId}`);
    let uptimeSeconds = 0;
    if (streamData.data && streamData.data.length > 0) {
      const startedAt = dayjs(streamData.data[0].started_at);
      uptimeSeconds = dayjs().diff(startedAt, "second");
    }

    res.json({
      followers,
      totalSubs,
      marathonSubs,
      uptimeSeconds,
      day: 1
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Twitch stats" });
  }
});

// Increment marathon subs
app.post("/add-sub", (req, res) => {
  marathonSubs++;
  res.json({ ok: true, marathonSubs });
});

// Set total subs manually
app.post("/set-total-subs", (req, res) => {
  const newTotal = Number(req.query.count);
  if (isNaN(newTotal)) {
    return res.status(400).json({ error: "Invalid count" });
  }
  totalSubs = newTotal;
  res.json({ ok: true, totalSubs });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Worker listening on port ${port}`));
