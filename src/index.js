import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(express.json());

let accessToken = null;
let tokenExpiry = null;

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
  return res.json();
}

// Stats endpoint
app.get("/stats", async (req, res) => {
  try {
    const userId = process.env.TWITCH_USER_ID;

    // Followers
    const followersData = await twitchAPI(`users/follows?to_id=${userId}`);
    const followers = followersData.total || 0;

    // Subs (requires broadcaster auth normally, but we’ll placeholder for now)
    const subs = 0;

    // Bits (same, placeholder)
    const bits = 0;

    // Stream uptime
    const streamData = await twitchAPI(`streams?user_id=${userId}`);
    let uptimeSeconds = 0;
    if (streamData.data && streamData.data.length > 0) {
      const startedAt = dayjs(streamData.data[0].started_at);
      uptimeSeconds = dayjs().diff(startedAt, "second");
    }

    res.json({
      followers,
      subs,
      bits,
      uptimeSeconds,
      day: 1
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Twitch stats" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Worker listening on port ${port}`));
