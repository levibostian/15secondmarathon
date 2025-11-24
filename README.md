# 15 Second Marathon

A synchronized video marathon experience that plays through a YouTube playlist of 15-second videos. Everyone watching sees the same video at the same time, creating a shared viewing experience.

## How It Works

The site plays through a YouTube playlist continuously in a loop. All visitors are synchronized to watch the same video at the same moment, based on system time. The playlist automatically loops when it reaches the end.

## Architecture

- **Frontend**: Static HTML/JS site that plays YouTube videos
- **Data Generation**: Deno script that fetches playlist data from YouTube API
- **Deployment**: GitHub Pages (gh-pages branch)
- **Automation**: Docker container run on schedule via cron/systemd

## Getting Started

### Prerequisites

- [Deno](https://deno.land/) (for running the script locally)
- YouTube API Key ([Get one here](https://developers.google.com/youtube/v3/getting-started))
- For automated updates: Docker and GitHub Personal Access Token

### Local Development

**1. Run the data update script manually:**

```bash
export YOUTUBE_API_KEY="your_youtube_api_key"
deno run --allow-all scripts/update_data.ts
```

This will:
- Fetch all videos from the configured YouTube playlist
- Get duration information for each video
- Generate `data.json` with video metadata and synchronization data
- (If run in Docker) Commit and push changes to gh-pages

**2. Test the site locally:**

Open `index.html` in your browser or use a local server:
```bash
python -m http.server 8000
# Visit http://localhost:8000
```

### Configuration

**Change the YouTube playlist:**

Edit `scripts/update_data.ts` line 35:
```typescript
playlistId: 'YOUR_PLAYLIST_ID_HERE'
```

## Automated Deployment with Docker

For production, run the update script automatically on your server using Docker.

### Quick Start

**1. Build the Docker image:**
```bash
docker-compose build
```

**2. Run manually to test:**
```bash
docker-compose run --rm \
  -e YOUTUBE_API_KEY="your_key" \
  -e GITHUB_TOKEN="your_github_token" \
  -e GIT_EMAIL="bot@example.com" \
  -e GIT_NAME="Bot Name" \
  update-data
```

**3. Schedule with cron:**

Create `/opt/scripts/update-15secondmarathon.sh`:
```bash
#!/bin/bash
cd /path/to/15secondmarathon
docker-compose run --rm \
  -e YOUTUBE_API_KEY="your_key" \
  -e GITHUB_TOKEN="your_token" \
  -e GIT_EMAIL="bot@example.com" \
  -e GIT_NAME="15SecondMarathon Bot" \
  update-data
```

Make it executable and add to crontab:
```bash
chmod +x /opt/scripts/update-15secondmarathon.sh
crontab -e
# Add: 0 0 * * * /opt/scripts/update-15secondmarathon.sh >> /var/log/15secondmarathon.log 2>&1
```

See [DOCKER.md](DOCKER.md) for detailed Docker setup instructions, including systemd timer configuration.

## Project Structure

```
.
├── index.html              # Main site page
├── data.json              # Generated playlist data (don't edit manually)
├── scripts/
│   └── update_data.ts     # YouTube data fetcher and git automation
├── Dockerfile             # Docker container configuration
├── docker-compose.yml     # Docker Compose configuration
└── DOCKER.md              # Detailed Docker setup guide
```

## Environment Variables

See `.env.example` for all required environment variables:

- `YOUTUBE_API_KEY` - Required for fetching playlist data
- `GITHUB_TOKEN` - Required for automated git push (repo scope)
- `GIT_EMAIL` - Git commit author email
- `GIT_NAME` - Git commit author name

## How Synchronization Works

1. The script calculates total duration of all videos in the playlist
2. Creates a lookup table mapping each second to a specific video and offset
3. The frontend calculates `currentTime = (epochSeconds % totalPlaylistDuration)`
4. Uses the lookup table to find which video and offset to play
5. All visitors calculate the same values = synchronized playback

## Troubleshooting

**"No changes to data.json" when running:**
- The playlist hasn't changed since last run
- This is normal and expected

**YouTube API errors:**
- Check your API key is valid
- Verify you haven't exceeded your API quota
- Ensure the playlist is public

**Git push fails:**
- Verify GITHUB_TOKEN has `repo` scope
- Check network connectivity
- Ensure gh-pages branch exists

## Contributing

Feel free to open issues or submit pull requests!

## License

MIT
