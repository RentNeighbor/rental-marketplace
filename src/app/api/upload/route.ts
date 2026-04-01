import { auth } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // "RIFF" — also check bytes 8-11 for "WEBP"
  "image/gif": [[0x47, 0x49, 0x46, 0x38]], // "GIF8"
};

function validateMagicBytes(
  header: Uint8Array,
  mimeType: string
): boolean {
  const patterns = MAGIC_BYTES[mimeType];
  if (!patterns) return false;

  const match = patterns.some((pattern) =>
    pattern.every((byte, i) => header[i] === byte)
  );
  if (!match) return false;

  if (mimeType === "image/webp") {
    const webpSig = String.fromCharCode(header[8], header[9], header[10], header[11]);
    if (webpSig !== "WEBP") return false;
  }

  return true;
}

// S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.)
const useS3 = !!(process.env.S3_BUCKET && process.env.S3_ENDPOINT);

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  const key = `uploads/${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // S3_PUBLIC_URL should be the public-facing URL for the bucket
  // e.g., https://your-bucket.s3.amazonaws.com or https://pub-xxx.r2.dev
  const publicUrl = process.env.S3_PUBLIC_URL!;
  return `${publicUrl}/${key}`;
}

async function uploadToLocal(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > 5) {
    return Response.json({ error: "Maximum 5 images allowed" }, { status: 400 });
  }

  const urls: string[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File too large: ${file.name}. Maximum size is 5MB` },
        { status: 400 }
      );
    }

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      return Response.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const header = new Uint8Array(bytes.slice(0, 12));

    if (!validateMagicBytes(header, file.type)) {
      return Response.json(
        { error: "File content does not match declared type" },
        { status: 400 }
      );
    }

    const filename = `${uuidv4()}.${ext}`;
    const buffer = Buffer.from(bytes);

    const url = useS3
      ? await uploadToS3(buffer, filename, file.type)
      : await uploadToLocal(buffer, filename);

    urls.push(url);
  }

  return Response.json({ urls });
}
