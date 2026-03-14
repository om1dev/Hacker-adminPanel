# Hacker-adminPanel (Backend + Admin Route)

Node.js + Express + Socket.io backend that controls synchronized playback across all connected clients.

## Features

- Real-time broadcast to all clients via Socket.io
- Admin control route at `/admin`
- 10-second countdown before video starts
- Reset sequence to stop video and return all clients to image
- Live connected client count in admin panel
- Late joiners receive current state (`idle`, `countdown`, or `playing`)

## Folder Structure

```
Hacker-adminPanel/
  public/
	 admin/
		index.html
		style.css
		script.js
  .env.example
  package.json
  render.yaml
  server.js
```

## Local Run

1. Install dependencies:

	`npm install`

2. Create `.env` from `.env.example` and set values.

3. Start server:

	`npm run dev`

4. Open admin panel:

	`http://localhost:3000/admin`

## Environment Variables

- `PORT`: backend port (default `3000`)
- `CLIENT_ORIGINS`: comma-separated allowed frontend origins
- `COUNTDOWN_SECONDS`: default `10`
- `VIDEO_URL`: public MP4 URL used by all clients
- `IMAGE_URL`: public image URL for idle screen

Example:

```
PORT=3000
CLIENT_ORIGINS=http://localhost:5500,https://your-client.vercel.app
COUNTDOWN_SECONDS=10
VIDEO_URL=https://your-cdn/video.mp4
IMAGE_URL=https://your-cdn/splash.jpg
```

## Free Deployment (Render)

Recommended for WebSockets.

1. Push this folder to GitHub.
2. In Render, create a new `Web Service` from that repo.
3. Use:
	- Build command: `npm install`
	- Start command: `npm start`
4. Configure env vars (`CLIENT_ORIGINS`, `VIDEO_URL`, `IMAGE_URL`).
5. Deploy and copy backend URL, for example:

	`https://hacker-sequence-backend.onrender.com`

## Notes

- Keep `VIDEO_URL` as a directly accessible MP4 file URL.
- Use a CDN/public bucket (Cloudinary, S3 public URL, Bunny, etc.) for video/image hosting.
- If you redeploy with a new URL, update frontend config and `CLIENT_ORIGINS`.