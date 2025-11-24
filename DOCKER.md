# Docker Setup Guide

This project can be run as a Docker container to automatically update the site data.

## Prerequisites

- Docker and Docker Compose installed
- YouTube API key
- GitHub Personal Access Token with `repo` scope

## Required Environment Variables

See `.env.example` for the list of required variables:
- `YOUTUBE_API_KEY` - YouTube API key for fetching playlist data
- `GITHUB_TOKEN` - GitHub Personal Access Token with `repo` scope
- `GIT_EMAIL` - Git commit author email
- `GIT_NAME` - Git commit author name

## Setup

**Build the Docker image:**
```bash
docker-compose build
# or
docker build -t 15secondmarathon-updater:latest .
```

## Usage

### Option 1: Docker Compose with inline env vars
```bash
docker-compose run --rm \
  -e YOUTUBE_API_KEY="your_key" \
  -e GITHUB_TOKEN="your_token" \
  -e GIT_EMAIL="your@email.com" \
  -e GIT_NAME="Your Name" \
  update-data
```

### Option 2: Direct docker run command
```bash
docker run --rm \
  -v $(pwd):/repo \
  -e YOUTUBE_API_KEY="your_key" \
  -e GITHUB_TOKEN="your_token" \
  -e GIT_EMAIL="your@email.com" \
  -e GIT_NAME="Your Name" \
  15secondmarathon-updater:latest
```

### Option 3: Using shell environment variables
```bash
# Export variables first
export YOUTUBE_API_KEY="your_key"
export GITHUB_TOKEN="your_token"
export GIT_EMAIL="your@email.com"
export GIT_NAME="Your Name"

# Then run (variables will be inherited)
docker-compose run --rm \
  -e YOUTUBE_API_KEY \
  -e GITHUB_TOKEN \
  -e GIT_EMAIL \
  -e GIT_NAME \
  update-data
```

## Scheduling with Cron

### Example cron job (Linux/macOS):

Create a shell script (`/opt/scripts/update-15secondmarathon.sh`):
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

Make it executable:
```bash
chmod +x /opt/scripts/update-15secondmarathon.sh
```

Add to crontab (`crontab -e`):
```bash
# Run daily at midnight
0 0 * * * /opt/scripts/update-15secondmarathon.sh >> /var/log/15secondmarathon.log 2>&1
```

### Alternative: systemd timer (Linux)

Create `/etc/systemd/system/15secondmarathon.service`:
```ini
[Unit]
Description=Update 15 Second Marathon data

[Service]
Type=oneshot
WorkingDirectory=/path/to/15secondmarathon
Environment="YOUTUBE_API_KEY=your_key"
Environment="GITHUB_TOKEN=your_token"
Environment="GIT_EMAIL=bot@example.com"
Environment="GIT_NAME=15SecondMarathon Bot"
ExecStart=/usr/bin/docker-compose run --rm -e YOUTUBE_API_KEY -e GITHUB_TOKEN -e GIT_EMAIL -e GIT_NAME update-data
```

Create `/etc/systemd/system/15secondmarathon.timer`:
```ini
[Unit]
Description=Run 15 Second Marathon update daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable 15secondmarathon.timer
systemctl start 15secondmarathon.timer
```

## What It Does

1. Fetches video data from the YouTube playlist
2. Generates updated `data.json` with video information
3. Commits changes if `data.json` was modified
4. Pushes to the `gh-pages` branch for deployment
5. Exits (container stops)

## Troubleshooting

- **Permission errors**: Ensure the mounted volume has proper permissions
- **Git push fails**: Verify your GitHub token has `repo` scope
- **YouTube API errors**: Check your API key and quota limits
