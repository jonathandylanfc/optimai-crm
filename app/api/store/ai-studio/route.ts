import { NextRequest, NextResponse } from "next/server";

// Generative "studio reshoot": sends the product photo to Google's Gemini
// image model with a prompt to place it on a clean background with better
// lighting, WITHOUT altering the product itself. Runs entirely in Node
// (no Python), so it is independent of the rembg image pipeline.

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

const DEFAULT_PROMPT =
  "Reshoot this exact product as a professional e-commerce product photo: " +
  "place it on a pure solid white (#FFFFFF) background with soft, even, professional studio lighting. " +
  "The product must be cleanly isolated with NO shadow, NO floor, and NO surface — it should appear " +
  "floating on plain white. Center the product in frame with a small margin so it does not touch the edges. " +
  "CRITICAL: keep the product itself completely unchanged — identical shape, proportions, colors, " +
  "materials, logos, and any text or labels. Do not add, remove, or redesign any part of the product. " +
  "Only change the background and lighting.";

// Remove the white background Gemini generates, leaving a TRANSPARENT PNG.
// Flood-fills near-white pixels starting from the image edges, so the surrounding
// white becomes transparent while white/chrome parts INSIDE the product (not
// connected to the border) are preserved. A light edge feather reduces haloing —
// important on a dark storefront where a white fringe would be visible.
async function whiteToTransparent(pngBuffer: Buffer): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Jimp = require("jimp");
  const img = await Jimp.read(pngBuffer);
  const { width, height, data } = img.bitmap as { width: number; height: number; data: Buffer };
  const N = width * height;
  const bg = new Uint8Array(N);
  const TH = 238; // treat r,g,b all >= TH as background white
  const isWhite = (p: number) => data[p * 4] >= TH && data[p * 4 + 1] >= TH && data[p * 4 + 2] >= TH;

  const stack: number[] = [];
  const seed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (bg[p] || !isWhite(p)) return;
    bg[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
  for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }
  while (stack.length) {
    const p = stack.pop() as number;
    const x = p % width;
    const y = (p - x) / width;
    seed(x + 1, y); seed(x - 1, y); seed(x, y + 1); seed(x, y - 1);
  }

  const lum = (p: number) => 0.299 * data[p * 4] + 0.587 * data[p * 4 + 1] + 0.114 * data[p * 4 + 2];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (bg[p]) { data[p * 4 + 3] = 0; continue; }
      // Anti-halo: fade light pixels that border the removed background
      const touchesBg =
        (x > 0 && bg[p - 1]) || (x < width - 1 && bg[p + 1]) ||
        (y > 0 && bg[p - width]) || (y < height - 1 && bg[p + width]);
      if (touchesBg) {
        const l = lum(p);
        if (l > 210) {
          const a = Math.max(0, Math.min(255, Math.round(((255 - l) / 45) * 255)));
          if (a < data[p * 4 + 3]) data[p * 4 + 3] = a;
        }
      }
    }
  }
  return img.getBufferAsync(Jimp.MIME_PNG);
}

async function uploadToCloudinary(pngBuffer: Buffer): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "v4h2yok3";
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "OPTIMAI";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(pngBuffer)], { type: "image/png" }), "product.png");
  form.append("upload_preset", uploadPreset);
  form.append("folder", "products");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${await res.text()}`);
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

type GeminiPart =
  | { text: string }
  | { inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string } };

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI Studio isn't configured. Add GEMINI_API_KEY to the CRM environment variables." },
      { status: 503 }
    );
  }

  const body = (await req.json()) as { url?: string; prompt?: string };
  const { url, prompt } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // 1. Fetch the source image
  let base64: string;
  let sourceMime = "image/png";
  try {
    const imgRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; image-fetcher/1.0)" } });
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${imgRes.status}` }, { status: 400 });
    }
    sourceMime = imgRes.headers.get("content-type")?.split(";")[0] || "image/png";
    base64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
  } catch (err) {
    return NextResponse.json({ error: `Could not fetch image: ${String(err)}` }, { status: 400 });
  }

  // 2. Call Gemini — try the configured model first, then known image models,
  //    so the feature works regardless of which ID the account has access to.
  const candidateModels = Array.from(
    new Set([
      DEFAULT_MODEL,
      "gemini-2.5-flash-image",
      "gemini-2.5-flash-image-preview",
      "gemini-2.0-flash-preview-image-generation",
    ])
  );

  let genB64: string | null = null;
  let lastError = "";
  try {
    for (const model of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(endpoint, {
        method: "POST",
        // Auth via header (works for both AIza… and newer AQ.… keys, and keeps
        // the key out of the URL / request logs)
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: sourceMime, data: base64 } },
                { text: prompt?.trim() || DEFAULT_PROMPT },
              ],
            },
          ],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message ?? `Gemini error ${res.status}`;
        lastError = msg;
        // 404 / not-found / unsupported → try the next model; otherwise stop
        if (res.status === 404 || /not found|not supported|unsupported|does not exist/i.test(msg)) {
          continue;
        }
        return NextResponse.json({ error: `AI Studio failed: ${msg}` }, { status: 502 });
      }

      const parts: GeminiPart[] = data?.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const inline = (part as { inlineData?: { data: string }; inline_data?: { data: string } });
        const d = inline.inlineData?.data ?? inline.inline_data?.data;
        if (d) {
          genB64 = d;
          break;
        }
      }
      if (genB64) break; // success
      lastError = "The model returned no image (it may have declined this photo).";
    }

    if (!genB64) {
      return NextResponse.json(
        { error: `AI Studio couldn't generate an image. ${lastError} If this mentions the model, set GEMINI_IMAGE_MODEL in the CRM env vars.` },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: `AI Studio request failed: ${String(err)}` }, { status: 502 });
  }

  // 3. Knock out the white background → transparent PNG, then upload to Cloudinary
  try {
    let outBuffer: Buffer = Buffer.from(genB64, "base64");
    try {
      outBuffer = await whiteToTransparent(outBuffer);
    } catch (e) {
      console.error("[ai-studio] transparency step failed, uploading as-is:", e);
    }
    const outUrl = await uploadToCloudinary(outBuffer);
    return NextResponse.json({ url: outUrl });
  } catch (err) {
    return NextResponse.json({ error: `Upload failed: ${String(err)}` }, { status: 500 });
  }
}
