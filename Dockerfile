FROM node:20-slim

WORKDIR /app

# --- Critical path: build and ship the CRM app first ---
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Optional: Python + rembg for AI background removal ---
# Kept AFTER the app build and made non-fatal so a slow/failed heavy
# install can never block the CRM from deploying. If this step fails,
# the app still ships and only the "Remove Background / Enhance" button
# degrades (the route already returns a clear error at runtime).
RUN (apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip libgl1-mesa-glx libglib2.0-0 \
      && rm -rf /var/lib/apt/lists/* \
      && pip3 install 'rembg[cpu]' pillow --break-system-packages) \
    || echo "WARNING: Python/rembg install failed — AI image processing will be unavailable, app still deploys."

EXPOSE 3000
CMD ["npm", "start"]
