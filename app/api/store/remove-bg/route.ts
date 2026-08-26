import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { fetchExternalImage } from "@/lib/safe-fetch";

type Mode = "remove-bg" | "enhance";
type CropRect = { x: number; y: number; w: number; h: number };

function processImage(imageBuffer: Buffer, mode: Mode, crops?: CropRect[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "process-image.py");
    const args = [scriptPath, mode];
    if (crops?.length) args.push(JSON.stringify(crops));
    console.log(`[remove-bg] cwd=${process.cwd()} script=${scriptPath} mode=${mode} regions=${crops?.length ?? 0}`);
    const proc = spawn("/usr/bin/python3", args, { timeout: 90_000, shell: false });

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

    proc.on("error", (err) => {
      console.error(`[remove-bg] spawn error: ${String(err)}`);
      reject(err);
    });
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
  const body = (await req.json()) as { url?: string; mode?: Mode; crop?: CropRect; crops?: CropRect[] };
  const { url, mode = "remove-bg", crop, crops } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Accept a list of regions to keep; a lone `crop` is still honoured so an
  // older client mid-deploy doesn't break.
  const requested = Array.isArray(crops) ? crops : crop ? [crop] : [];

  // Drop anything invalid, too small to be a real selection, or covering the
  // whole frame — a full-frame region is the same as no selection at all.
  const validCrops = requested.filter(
    (c) =>
      c &&
      [c.x, c.y, c.w, c.h].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1) &&
      c.w > 0.02 &&
      c.h > 0.02 &&
      !(c.x === 0 && c.y === 0 && c.w === 1 && c.h === 1)
  );

  let imageBuffer: Buffer;
  try {
    const imgRes = await fetchExternalImage(url);
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${imgRes.status}` }, { status: 400 });
    }
    imageBuffer = Buffer.from(await imgRes.arrayBuffer());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not fetch image." },
      { status: 400 }
    );
  }

  let pngBuffer: Buffer;
  try {
    pngBuffer = await processImage(imageBuffer, mode, validCrops);
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
