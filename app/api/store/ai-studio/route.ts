import { NextRequest, NextResponse } from "next/server";

// Generative "studio reshoot": sends the product photo to Google's Gemini
// image model with a prompt to place it on a clean background with better
// lighting, WITHOUT altering the product itself. Runs entirely in Node
// (no Python), so it is independent of the rembg image pipeline.

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

const DEFAULT_PROMPT =
  "Reshoot this exact product as a professional e-commerce product photo: " +
  "place it on a clean, pure white studio background with soft, even, professional lighting " +
  "and a subtle natural shadow. Center the product in frame. " +
  "CRITICAL: keep the product itself completely unchanged — identical shape, proportions, colors, " +
  "materials, logos, and any text or labels. Do not add, remove, or redesign any part of the product. " +
  "Only change the background and lighting.";

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

  // 2. Call Gemini
  let genB64: string | null = null;
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    if (!genB64) {
      return NextResponse.json(
        { error: "AI Studio returned no image. The model may have declined — try a different photo." },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: `AI Studio request failed: ${String(err)}` }, { status: 502 });
  }

  // 3. Upload the generated image to Cloudinary
  try {
    const outUrl = await uploadToCloudinary(Buffer.from(genB64, "base64"));
    return NextResponse.json({ url: outUrl });
  } catch (err) {
    return NextResponse.json({ error: `Upload failed: ${String(err)}` }, { status: 500 });
  }
}
