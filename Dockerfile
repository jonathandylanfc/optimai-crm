FROM node:20-slim

# Install Python3 and system libraries required by rembg/PIL
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python image-processing packages
RUN pip3 install 'rembg[cpu]' pillow --break-system-packages

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
