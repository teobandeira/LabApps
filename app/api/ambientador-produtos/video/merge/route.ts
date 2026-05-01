import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_INV = 9_999_999_999_999;
const TARGET_VIDEO_BITRATE_BPS = 2_300_000;
const TARGET_AUDIO_BITRATE_BPS = 128_000;
const TARGET_VIDEO_PRESETS = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
} as const;
const VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mpeg",
  ".mpg",
  ".m4v",
];

const execFileAsync = promisify(execFile);
const ffmpegStatic = (() => {
  try {
    return require("ffmpeg-static") as string | null;
  } catch {
    return null;
  }
})();

function addCandidate(
  target: Set<string>,
  value: string | null | undefined,
) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed) return;
  target.add(trimmed);
}

function addCandidateWithRootFallback(
  target: Set<string>,
  value: string | null | undefined,
) {
  addCandidate(target, value);
  if (typeof value !== "string" || !value.startsWith("/ROOT/")) return;

  const withoutRootPrefix = value.slice("/ROOT/".length);
  addCandidate(target, path.join(process.cwd(), withoutRootPrefix));
  addCandidate(target, path.join("/var/task", withoutRootPrefix));
}

function buildFfmpegBinaryCandidates() {
  const candidates = new Set<string>();
  const executableName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

  addCandidateWithRootFallback(candidates, process.env.FFMPEG_PATH);
  addCandidateWithRootFallback(candidates, process.env.FFMPEG_BIN);
  addCandidateWithRootFallback(candidates, ffmpegStatic);

  try {
    const ffmpegStaticModulePath = require.resolve("ffmpeg-static");
    const ffmpegStaticDir = path.dirname(ffmpegStaticModulePath);
    addCandidate(candidates, path.join(ffmpegStaticDir, executableName));
  } catch {
    // Pacote pode não estar resolvível em alguns empacotamentos.
  }

  addCandidate(
    candidates,
    path.join(process.cwd(), "node_modules", "ffmpeg-static", executableName),
  );
  addCandidate(
    candidates,
    path.join("/var/task", "node_modules", "ffmpeg-static", executableName),
  );
  addCandidate(
    candidates,
    path.join(
      "/var/task",
      ".next",
      "server",
      "node_modules",
      "ffmpeg-static",
      executableName,
    ),
  );
  addCandidate(candidates, "ffmpeg");

  return Array.from(candidates);
}

const FFMPEG_BINARY_CANDIDATES = buildFfmpegBinaryCandidates();

type RequestPayload = {
  videoIds?: number[];
  estimateOnly?: boolean;
  preserveAudio?: boolean;
  aspectRatio?: string;
};

type TokenPayload = {
  id: number;
  email: string;
  permissao: string;
  nome: string;
  iat?: number;
  exp?: number;
};

type AspectRatio = keyof typeof TARGET_VIDEO_PRESETS;

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sanitizeFilename(name: string) {
  return (name || "arquivo")
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]/g, "")
    .slice(0, 120);
}

function buildNewestFirstPath(originalName: string, folder = "ambientador") {
  const inv = String(MAX_INV - Date.now()).padStart(13, "0");
  const rand = Math.random().toString(36).slice(2, 8);
  const safe = sanitizeFilename(originalName);
  return `/${folder}/${inv}_${rand}_${safe}`;
}

function getAuthFromCookie(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as TokenPayload;

    if (!decoded?.id) return null;
    return decoded;
  } catch {
    return null;
  }
}

function isVideoPath(pathname: string, url: string) {
  const source = `${pathname || ""} ${url || ""}`.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => source.includes(ext));
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const parsed = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
  return Array.from(new Set(parsed));
}

function parseAspectRatio(value: unknown): AspectRatio | null {
  const normalized = normalizeText(value);
  if (normalized === "16:9" || normalized === "9:16") {
    return normalized;
  }
  return null;
}

function estimateMergedSizeBytes(
  totalDurationSeconds: number,
  preserveAudio: boolean,
) {
  const totalBitrate = preserveAudio
    ? TARGET_VIDEO_BITRATE_BPS + TARGET_AUDIO_BITRATE_BPS
    : TARGET_VIDEO_BITRATE_BPS;
  const estimated = Math.round(
    ((Math.max(totalDurationSeconds, 0) * totalBitrate) / 8) * 1.04,
  );
  return Math.max(1, estimated);
}

async function runBinary(binary: string, args: string[]) {
  try {
    return await execFileAsync(binary, args, { maxBuffer: 16 * 1024 * 1024 });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      throw new Error(`Dependência ausente no servidor: ${binary}.`);
    }
    throw error;
  }
}

function isMissingBinaryError(error: any, binary: string) {
  if (error?.code === "ENOENT" || error?.code === "EACCES") return true;
  const message = typeof error?.message === "string" ? error.message : "";
  return (
    message.includes(`Dependência ausente no servidor: ${binary}.`) ||
    ((message.includes("ENOENT") || message.includes("EACCES")) &&
      message.includes(binary))
  );
}

async function runFfmpeg(args: string[]) {
  for (const binary of FFMPEG_BINARY_CANDIDATES) {
    try {
      if (binary !== "ffmpeg") {
        await chmod(binary, 0o755).catch(() => {});
      }
      return await runBinary(binary, args);
    } catch (error: any) {
      if (!isMissingBinaryError(error, binary)) {
        throw error;
      }
    }
  }

  const tried = FFMPEG_BINARY_CANDIDATES.map((entry) => `"${entry}"`).join(", ");
  throw new Error(
    `FFmpeg indisponível no runtime. Tentativas: ${tried}. platform=${process.platform}, arch=${process.arch}.`,
  );
}

function parseDurationToSeconds(value: string) {
  const match = value.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseFloat(match[3]);
  const total = hours * 3600 + minutes * 60 + seconds;

  if (!Number.isFinite(total) || total <= 0) return null;
  return total;
}

function parseProgressTimeToSeconds(value: string) {
  const matches = Array.from(
    value.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/gi),
  );
  if (!matches.length) return null;

  const last = matches[matches.length - 1];
  const hours = Number.parseInt(last[1], 10);
  const minutes = Number.parseInt(last[2], 10);
  const seconds = Number.parseFloat(last[3]);
  const total = hours * 3600 + minutes * 60 + seconds;

  if (!Number.isFinite(total) || total <= 0) return null;
  return total;
}

function parseHasAudioStream(value: string) {
  return /Stream #\d+:\d+(?:\[[^\]]+\])?(?:\([^)]+\))?: Audio:/i.test(value);
}

function parseVideoDimensions(value: string) {
  const matches = Array.from(
    value.matchAll(
      /Stream #\d+:\d+(?:\[[^\]]+\])?(?:\([^)]+\))?: Video:[^\n]*?(\d{2,5})x(\d{2,5})(?:\b|[ ,\[])/gi,
    ),
  );
  if (!matches.length) {
    return { width: null, height: null };
  }

  const last = matches[matches.length - 1];
  const width = Number.parseInt(last[1], 10);
  const height = Number.parseInt(last[2], 10);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return { width: null, height: null };
  }

  return { width, height };
}

function resolveTargetVideoPreset(params: {
  requestedAspectRatio: AspectRatio | null;
  inspectedVideos: Array<{ width: number | null; height: number | null }>;
}) {
  if (params.requestedAspectRatio) {
    return {
      aspectRatio: params.requestedAspectRatio,
      ...TARGET_VIDEO_PRESETS[params.requestedAspectRatio],
    };
  }

  let portraitVotes = 0;
  let landscapeVotes = 0;
  let firstDetected: AspectRatio | null = null;

  for (const video of params.inspectedVideos) {
    if (!video.width || !video.height) continue;
    const ratio: AspectRatio = video.height > video.width ? "9:16" : "16:9";
    if (!firstDetected) firstDetected = ratio;
    if (ratio === "9:16") {
      portraitVotes += 1;
    } else {
      landscapeVotes += 1;
    }
  }

  const resolvedAspectRatio: AspectRatio =
    portraitVotes > landscapeVotes
      ? "9:16"
      : landscapeVotes > portraitVotes
        ? "16:9"
        : firstDetected || "16:9";

  return {
    aspectRatio: resolvedAspectRatio,
    ...TARGET_VIDEO_PRESETS[resolvedAspectRatio],
  };
}

async function runFfmpegAndCaptureOutput(args: string[]) {
  try {
    const { stdout, stderr } = await runFfmpeg(args);
    return `${normalizeText(stdout)}\n${normalizeText(stderr)}`;
  } catch (error: any) {
    if (
      typeof error?.message === "string" &&
      (error.message.includes("Dependência ausente no servidor") ||
        error.message.includes("FFmpeg indisponível no runtime"))
    ) {
      throw error;
    }
    const stdout = normalizeText(error?.stdout);
    const stderr = normalizeText(error?.stderr);
    return `${stdout}\n${stderr}`;
  }
}

async function probeMediaInfo(filePath: string) {
  const inspectOutput = await runFfmpegAndCaptureOutput([
    "-hide_banner",
    "-i",
    filePath,
  ]);
  const hasAudioStream = parseHasAudioStream(inspectOutput);
  const durationFromMeta = parseDurationToSeconds(inspectOutput);
  const { width, height } = parseVideoDimensions(inspectOutput);
  if (durationFromMeta) {
    return {
      durationSeconds: durationFromMeta,
      hasAudioStream,
      width,
      height,
    };
  }

  const progressOutput = await runFfmpegAndCaptureOutput([
    "-hide_banner",
    "-i",
    filePath,
    "-map",
    "0:v:0",
    "-f",
    "null",
    "-",
  ]);
  const durationFromProgress = parseProgressTimeToSeconds(progressOutput);
  return {
    durationSeconds: durationFromProgress,
    hasAudioStream,
    width,
    height,
  };
}

async function downloadVideoToFile(url: string, targetPath: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Não foi possível baixar um vídeo selecionado.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength) {
    throw new Error("Um dos vídeos selecionados está vazio.");
  }

  await writeFile(targetPath, bytes);
  return bytes.byteLength;
}

async function normalizeVideoForMerge(params: {
  inputPath: string;
  outputPath: string;
  preserveAudio: boolean;
  hasAudioStream: boolean;
  targetWidth: number;
  targetHeight: number;
}) {
  const targetSize = `${params.targetWidth}:${params.targetHeight}`;
  const filter = [
    `scale=${targetSize}:force_original_aspect_ratio=increase`,
    `crop=${targetSize}`,
    "fps=30",
  ].join(",");

  const baseArgs = [
    "-y",
    "-i",
    params.inputPath,
    "-vf",
    filter,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
  ];

  if (!params.preserveAudio) {
    await runFfmpeg([
      ...baseArgs,
      "-an",
      "-movflags",
      "+faststart",
      params.outputPath,
    ]);
    return;
  }

  if (params.hasAudioStream) {
    await runFfmpeg([
      ...baseArgs,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-ar",
      "48000",
      "-shortest",
      "-movflags",
      "+faststart",
      params.outputPath,
    ]);
    return;
  }

  await runFfmpeg([
    "-y",
    "-i",
    params.inputPath,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-vf",
    filter,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-ar",
    "48000",
    "-shortest",
    "-movflags",
    "+faststart",
    params.outputPath,
  ]);
}

async function concatNormalizedVideos(params: {
  listPath: string;
  outputPath: string;
  preserveAudio: boolean;
}) {
  const baseArgs = [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    params.listPath,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
  ];

  if (!params.preserveAudio) {
    await runFfmpeg([
      ...baseArgs,
      "-an",
      "-movflags",
      "+faststart",
      params.outputPath,
    ]);
    return;
  }

  await runFfmpeg([
    ...baseArgs,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    params.outputPath,
  ]);
}

function escapeConcatPath(filePath: string) {
  return filePath.replace(/'/g, "'\\''");
}

async function generateDefaultVideoThumbWebp() {
  return sharp({
    create: {
      width: 320,
      height: 320,
      channels: 3,
      background: { r: 24, g: 24, b: 27 },
    },
  })
    .webp({ quality: 70 })
    .toBuffer();
}

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;

  try {
    const body = (await req.json()) as RequestPayload;
    const videoIds = asNumberArray(body.videoIds);
    const estimateOnly = Boolean(body.estimateOnly);
    const preserveAudio = body.preserveAudio !== false;
    const requestedAspectRatio = parseAspectRatio(body.aspectRatio);

    if (videoIds.length < 2) {
      return NextResponse.json(
        { error: "Selecione ao menos 2 vídeos para juntar." },
        { status: 400 },
      );
    }

    const items = await prisma.ambientadorImagem.findMany({
      where: { id: { in: videoIds } },
      select: {
        id: true,
        pathname: true,
        url: true,
      },
    });

    if (items.length !== videoIds.length) {
      return NextResponse.json(
        { error: "Alguns vídeos selecionados não foram encontrados." },
        { status: 404 },
      );
    }

    const itemsById = new Map(items.map((item) => [item.id, item]));
    const orderedItems = videoIds
      .map((id) => itemsById.get(id))
      .filter((item): item is (typeof items)[number] => Boolean(item));

    const nonVideoItem = orderedItems.find(
      (item) => !isVideoPath(item.pathname, item.url),
    );
    if (nonVideoItem) {
      return NextResponse.json(
        { error: "A seleção contém item que não é vídeo." },
        { status: 400 },
      );
    }

    tempDir = await mkdtemp(path.join(tmpdir(), "ambientador-video-merge-"));

    const inputPaths: string[] = [];
    const inputHasAudio: boolean[] = [];
    const inputDimensions: Array<{ width: number | null; height: number | null }> =
      [];
    let totalDurationSeconds = 0;
    let unknownDurationCount = 0;
    let sourceTotalBytes = 0;

    for (let index = 0; index < orderedItems.length; index += 1) {
      const item = orderedItems[index];
      const inputPath = path.join(tempDir, `input-${index + 1}.mp4`);
      const sizeBytes = await downloadVideoToFile(item.url, inputPath);
      const mediaInfo = await probeMediaInfo(inputPath);
      const durationSeconds = mediaInfo.durationSeconds;
      const hasAudioStream = mediaInfo.hasAudioStream;

      inputPaths.push(inputPath);
      inputHasAudio.push(hasAudioStream);
      inputDimensions.push({ width: mediaInfo.width, height: mediaInfo.height });
      sourceTotalBytes += sizeBytes;
      if (typeof durationSeconds === "number" && durationSeconds > 0) {
        totalDurationSeconds += durationSeconds;
      } else {
        unknownDurationCount += 1;
      }
    }

    const estimatedDurationSeconds =
      totalDurationSeconds + unknownDurationCount * 8;
    const estimatedSizeBytes =
      estimatedDurationSeconds > 0
        ? estimateMergedSizeBytes(estimatedDurationSeconds, preserveAudio)
        : Math.max(
            1,
            Math.round(sourceTotalBytes * (preserveAudio ? 1.04 : 0.92)),
          );
    const targetVideoPreset = resolveTargetVideoPreset({
      requestedAspectRatio,
      inspectedVideos: inputDimensions,
    });

    if (estimateOnly) {
      return NextResponse.json(
        {
          estimated_size_bytes: estimatedSizeBytes,
          source_total_bytes: sourceTotalBytes,
          total_duration_seconds: estimatedDurationSeconds,
          total_videos: orderedItems.length,
          duration_estimated: unknownDurationCount > 0,
          preserve_audio: preserveAudio,
          output_aspect_ratio: targetVideoPreset.aspectRatio,
          output_resolution: `${targetVideoPreset.width}x${targetVideoPreset.height}`,
        },
        { status: 200 },
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN não configurado." },
        { status: 500 },
      );
    }

    const normalizedPaths: string[] = [];
    for (let index = 0; index < inputPaths.length; index += 1) {
      const normalizedPath = path.join(tempDir, `normalized-${index + 1}.mp4`);
      await normalizeVideoForMerge({
        inputPath: inputPaths[index],
        outputPath: normalizedPath,
        preserveAudio,
        hasAudioStream: Boolean(inputHasAudio[index]),
        targetWidth: targetVideoPreset.width,
        targetHeight: targetVideoPreset.height,
      });
      normalizedPaths.push(normalizedPath);
    }

    const concatListPath = path.join(tempDir, "concat-list.txt");
    const concatList = normalizedPaths
      .map((filePath) => `file '${escapeConcatPath(filePath)}'`)
      .join("\n");
    await writeFile(concatListPath, `${concatList}\n`, "utf8");

    const mergedOutputPath = path.join(tempDir, "merged-output.mp4");
    await concatNormalizedVideos({
      listPath: concatListPath,
      outputPath: mergedOutputPath,
      preserveAudio,
    });

    const mergedStats = await stat(mergedOutputPath);
    const mergedDurationProbe = await probeMediaInfo(mergedOutputPath);
    const mergedDurationSeconds =
      typeof mergedDurationProbe.durationSeconds === "number" &&
      mergedDurationProbe.durationSeconds > 0
        ? mergedDurationProbe.durationSeconds
        : estimatedDurationSeconds;
    const mergedBuffer = await readFile(mergedOutputPath);

    const mergedPathname = buildNewestFirstPath(
      `ambientacao-video-merge-${Date.now()}.mp4`,
      "ambientador/videos",
    );
    const uploadedVideo = await put(mergedPathname, mergedBuffer, {
      access: "public",
      contentType: "video/mp4",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const thumbBuffer = await generateDefaultVideoThumbWebp();
    const thumbPathname = buildNewestFirstPath(
      `ambientacao-video-merge-thumb-${Date.now()}.webp`,
      "ambientador/thumbs",
    );
    const uploadedThumb = await put(thumbPathname, thumbBuffer, {
      access: "public",
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const auth = getAuthFromCookie(req);

    const imagem = await prisma.ambientadorImagem.create({
      data: {
        pathname: uploadedVideo.pathname,
        url: uploadedVideo.url,
        model: "video_merge",
        thumbPathname: uploadedThumb.pathname,
        thumbUrl: uploadedThumb.url,
        createdById: auth?.id || null,
      },
      select: { id: true },
    });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "desconhecido";

    await prisma.ambientadorImagemLog.create({
      data: {
        imagemId: imagem.id,
        userId: auth?.id || null,
        ip,
      },
    });

    return NextResponse.json(
      {
        video_url: uploadedVideo.url,
        video_pathname: uploadedVideo.pathname,
        thumb_url: uploadedThumb.url,
        thumb_pathname: uploadedThumb.pathname,
        image_id: imagem.id,
        merged_size_bytes: mergedStats.size,
        total_duration_seconds: mergedDurationSeconds,
        estimated_size_bytes: estimatedSizeBytes,
        source_total_bytes: sourceTotalBytes,
        duration_estimated: unknownDurationCount > 0,
        preserve_audio: preserveAudio,
        output_aspect_ratio: targetVideoPreset.aspectRatio,
        output_resolution: `${targetVideoPreset.width}x${targetVideoPreset.height}`,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Erro ao juntar vídeos do ambientador:", error);

    const status =
      Number(error?.status) ||
      Number(error?.response?.status) ||
      Number(error?.code) ||
      500;

    const message =
      error?.message ||
      error?.error?.message ||
      "Não foi possível juntar os vídeos selecionados.";

    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
