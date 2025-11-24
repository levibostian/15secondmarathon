# Docker Setup Guide

This project can be run as a Docker container to automatically update the site data.

## Prerequisites

- Docker and Docker Compose installed
- YouTube API key
- GitHub Personal Access Token with `repo` scope

## Setup

1. **Copy environment variables template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials:**
   ```bash
   YOUTUBE_API_KEY=your_actual_key
   GITHUB_TOKEN=your_actual_token
   GIT_EMAIL=your@email.com
   GIT_NAME=Your Name
   ```

3. **Build the Docker image:**
   ```bash
   docker-compose build
   ```

## Usage

### Run manually:
```bash
docker-compose run --rm update-data
```

### Set up cron job (Linux/macOS):

Add to your crontab (`crontab -e`):
```bash
# Run daily at midnight
0 0 * * * cd /path/to/15secondmarathon && docker-compose run --rm update-data >> /var/log/15secondmarathon.log 2>&1
```

### Alternative: Docker run command
```bash
docker run --rm \
  -v $(pwd):/repo \
  -e YOUTUBE_API_KEY="$YOUTUBE_API_KEY" \
  -e GITHUB_TOKEN="$GITHUB_TOKEN" \
  -e GIT_EMAIL="$GIT_EMAIL" \
  -e GIT_NAME="$GIT_NAME" \
  15secondmarathon-updater:latest
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
