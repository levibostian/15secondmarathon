FROM denoland/deno:2.1.4

# Install git for committing and pushing changes
RUN apt-get update && \
    apt-get install -y git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory to the repo
WORKDIR /repo

# Copy the entire repository
COPY . .

# Cache dependencies by running with --cached-only first
RUN deno cache --reload scripts/update_data.ts

# Set up entrypoint script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Configure git if credentials provided\n\
if [ -n "$GIT_EMAIL" ]; then\n\
  git config --global user.email "$GIT_EMAIL"\n\
fi\n\
if [ -n "$GIT_NAME" ]; then\n\
  git config --global user.name "$GIT_NAME"\n\
fi\n\
\n\
# Run the update script\n\
echo "Running update_data.ts..."\n\
deno run --allow-all scripts/update_data.ts\n\
\n\
echo "Script completed successfully"\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
