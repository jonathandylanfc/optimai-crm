import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

type Mode = "remove-bg" | "enhance";

function processImage(imageBuffer: Buffer, mode: Mode): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "process-image.py");
    const proc = spawn("python3", [scriptPath, mode], { timeout: 90_000 });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(Buffer.concat(errChunks).toString() || `exit code ${code}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });

    proc.on("error", reject);
    proc.stdin.write(imageBuffer);
    proc.stdin.end();
  });
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${text}`);
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { url?: string; mode?: Mode };
  const { url, mode = "remove-bg" } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let imageBuffer: Buffer;
  try {
    const imgRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; image-fetcher/1.0)" },
    });
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${imgRes.status}` }, { status: 400 });
    }
    imageBuffer = Buffer.from(await imgRes.arrayBuffer());
  } catch (err) {
    return NextResponse.json({ error: `Could not fetch image: ${String(err)}` }, { status: 400 });
  }

  let pngBuffer: Buffer;
  try {
    pngBuffer = await processImage(imageBuffer, mode);
  } catch (err) {
    return NextResponse.json({ error: `Image processing failed: ${String(err)}` }, { status: 500 });
  }

  let cloudinaryUrl: string;
  try {
    cloudinaryUrl = await uploadToCloudinary(pngBuffer);
  } catch (err) {
    return NextResponse.json({ error: `Upload failed: ${String(err)}` }, { status: 500 });
  }

  return NextResponse.json({ url: cloudinaryUrl });
}
