import crypto from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const execFile = promisify(execFileCallback);
const ALLOWED_ASPECT_RATIOS = new Set(["16:9", "9:16"]);
const TARGET_SIZE_BY_ASPECT: Record<"16:9" | "9:16", { width: number; height: number }> = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
};

type MergeBody = {
  videoIds?: string[];
  preserveAudio?: boolean;
  aspectRatio?: string;
  estimateOnly?: boolean;
};

type VideoRecord = {
  id: string;
  blobPath: string;
  blobUrl: string;
  mimeType: string;
  bytes: number;
};

type BlobReadResult = {
  bytes: Uint8Array;
  contentType: string;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toUniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const id = normalizeString(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

async function ensureFfmpegAvailable() {
  await execFile("ffmpeg", ["-version"]);
  await execFile("ffprobe", ["-version"]);
}

async function readFromBlob(pathname: string, token: string): Promise<BlobReadResult | null> {
  try {
    const privateRead = await get(pathname, {
      access: "private",
      token,
      useCache: false,
    });

    if (privateRead && privateRead.statusCode === 200) {
      return {
        bytes: new Uint8Array(await new Response(privateRead.stream).arrayBuffer()),
        contentType: privateRead.blob.contentType,
      };
    }
  } catch {
    // fallback below
  }

  try {
    const publicRead = await get(pathname, {
      access: "public",
      token,
      useCache: true,
    });

    if (publicRead && publicRead.statusCode === 200) {
      return {
        bytes: new Uint8Array(await new Response(publicRead.stream).arrayBuffer()),
        contentType: publicRead.blob.contentType,
      };
    }
  } catch {
    // fallback below
  }

  return null;
}

async function fetchVideoBytes(record: VideoRecord, blobToken?: string): Promise<BlobReadResult> {
  if (blobToken) {
    const readResult = await readFromBlob(record.blobPath, blobToken);
    if (readResult && readResult.bytes.byteLength > 0) {
      return readResult;
    }
  }

  const response = await fetch(record.blobUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Nao foi possivel baixar o video ${record.id}.`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength <= 0) {
    throw new Error(`Video ${record.id} retornou vazio.`);
  }

  return {
    bytes,
    contentType: response.headers.get("content-type")?.split(";")[0]?.trim() || record.mimeType,
  };
}

async function probeVideoDurationSeconds(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFile("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  } catch {
    return 0;
  }
}

async function probeHasAudio(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFile("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "a",
      "-show_entries",
      "stream=index",
      "-of",
      "csv=p=0",
      filePath,
    ]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function buildBlobPath(extension: string): string {
  const datePath = new Date().toISOString().slice(0, 10);
  return `chatgpt/generated/${datePath}/${crypto.randomUUID()}.${extension}`;
}

export async function POST(request: Request) {
  let tempDir = "";

  try {
    const body = (await request.json()) as MergeBody;
    const videoIds = toUniqueStrings(body.videoIds);
    const preserveAudio = body.preserveAudio !== false;
    const aspectRatioInput = normalizeString(body.aspectRatio);
    const aspectRatio = ALLOWED_ASPECT_RATIOS.has(aspectRatioInput)
      ? (aspectRatioInput as "16:9" | "9:16")
      : "9:16";
    const estimateOnly = body.estimateOnly === true;

    if (videoIds.length < 2) {
      return NextResponse.json({ error: "Selecione ao menos 2 videos para juntar." }, { status: 400 });
    }

    const recordsRaw = await prisma.generatedVideo.findMany({
      where: { id: { in: videoIds } },
      select: {
        id: true,
        blobPath: true,
        blobUrl: true,
        mimeType: true,
        bytes: true,
      },
    });

    if (recordsRaw.length !== videoIds.length) {
      return NextResponse.json({ error: "Um ou mais videos nao foram encontrados." }, { status: 404 });
    }

    const recordsById = new Map(recordsRaw.map((record) => [record.id, record]));
    const orderedRecords = videoIds
      .map((id) => recordsById.get(id))
      .filter((record): record is VideoRecord => !!record);

    const sourceTotalBytes = orderedRecords.reduce((sum, record) => sum + Number(record.bytes || 0), 0);
    if (estimateOnly) {
      return NextResponse.json({
        estimated_size_bytes: sourceTotalBytes,
        source_total_bytes: sourceTotalBytes,
      });
    }

    await ensureFfmpegAvailable();

    tempDir = await mkdtemp(path.join(os.tmpdir(), "chatgpt-video-merge-"));
    await mkdir(tempDir, { recursive: true });

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    const inputPaths: string[] = [];
    const audioPresence: boolean[] = [];
    let durationTotalSeconds = 0;

    for (let index = 0; index < orderedRecords.length; index += 1) {
      const record = orderedRecords[index];
      if (!record) continue;

      const fetched = await fetchVideoBytes(record, blobToken);
      const inputPath = path.join(tempDir, `input-${index}.mp4`);
      await writeFile(inputPath, Buffer.from(fetched.bytes));
      inputPaths.push(inputPath);

      audioPresence.push(await probeHasAudio(inputPath));
      durationTotalSeconds += await probeVideoDurationSeconds(inputPath);
    }

    const targetSize = TARGET_SIZE_BY_ASPECT[aspectRatio];
    const allHaveAudio = audioPresence.every(Boolean);
    const useAudio = preserveAudio && allHaveAudio;

    const ffmpegArgs: string[] = ["-y"];
    for (const inputPath of inputPaths) {
      ffmpegArgs.push("-i", inputPath);
    }

    const videoChains = inputPaths.map((_, index) =>
      `[${index}:v]scale=${targetSize.width}:${targetSize.height}:force_original_aspect_ratio=decrease,pad=${targetSize.width}:${targetSize.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${index}]`
    );

    const audioChains = useAudio
      ? inputPaths.map((_, index) => `[${index}:a]aresample=async=1:first_pts=0[a${index}]`)
      : [];

    const concatInputs = inputPaths
      .map((_, index) => (useAudio ? `[v${index}][a${index}]` : `[v${index}]`))
      .join("");

    const concatNode = useAudio
      ? `${concatInputs}concat=n=${inputPaths.length}:v=1:a=1[v][a]`
      : `${concatInputs}concat=n=${inputPaths.length}:v=1:a=0[v]`;

    const filterComplex = [...videoChains, ...audioChains, concatNode].join(";");

    const outputPath = path.join(tempDir, "merged-output.mp4");
    ffmpegArgs.push("-filter_complex", filterComplex, "-map", "[v]");
    if (useAudio) {
      ffmpegArgs.push("-map", "[a]", "-c:a", "aac", "-b:a", "128k");
    }

    ffmpegArgs.push(
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      outputPath
    );

    await execFile("ffmpeg", ffmpegArgs);

    const mergedBuffer = await readFile(outputPath);
    if (mergedBuffer.byteLength <= 0) {
      throw new Error("Video final foi gerado vazio.");
    }

    const blobTokenRequired = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobTokenRequired) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN nao configurado no ambiente." },
        { status: 500 }
      );
    }

    const blobPath = buildBlobPath("mp4");
    const uploaded = await put(blobPath, mergedBuffer, {
      access: "public",
      contentType: "video/mp4",
      token: blobTokenRequired,
      addRandomSuffix: false,
    });

    const persisted = await prisma.generatedVideo.create({
      data: {
        sourceImageId: null,
        operationName: `merge-${crypto.randomUUID()}`,
        model: "video-merge",
        aspectRatio,
        durationSeconds: Math.max(1, Math.round(durationTotalSeconds)),
        resolution: "720p",
        blobUrl: uploaded.url,
        blobPath: uploaded.pathname,
        mimeType: "video/mp4",
        bytes: mergedBuffer.byteLength,
      },
      select: { id: true },
    });

    return NextResponse.json({
      video_id: persisted.id,
      video_url: `/api/chatgpt/generated-video/${persisted.id}`,
      merged_size_bytes: mergedBuffer.byteLength,
      estimated_size_bytes: sourceTotalBytes,
      source_total_bytes: sourceTotalBytes,
      warning:
        preserveAudio && !allHaveAudio
          ? "Alguns videos nao possuem audio. O audio foi removido na uniao final."
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel juntar os videos.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
