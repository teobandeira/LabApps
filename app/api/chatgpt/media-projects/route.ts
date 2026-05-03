import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ProjectPayload = {
  id: string;
  name: string;
  createdAt: string;
  coverImageUrl: string | null;
  imageIds: string[];
  videoIds: string[];
};

type ProjectRow = {
  id: string;
  name: string;
  createdAt: Date | string;
  coverImageUrl: string | null;
};

type ProjectImageRow = {
  projectId: string;
  imageId: string;
};

type ProjectVideoRow = {
  projectId: string;
  videoId: string;
};

const PROJECTS_TABLE = "chatgpt_media_projects";
const PROJECT_IMAGES_TABLE = "chatgpt_media_project_images";
const PROJECT_VIDEOS_TABLE = "chatgpt_media_project_videos";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function createId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeDateIso(value: unknown): string {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    const normalized = normalizeString(item);
    if (normalized) {
      unique.add(normalized.slice(0, 191));
    }
  }
  return Array.from(unique);
}

function normalizeProjectsPayload(value: unknown): ProjectPayload[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const project = entry as {
        id?: unknown;
        name?: unknown;
        createdAt?: unknown;
        coverImageUrl?: unknown;
        imageIds?: unknown;
        videoIds?: unknown;
      };

      const id = normalizeString(project.id).slice(0, 191) || createId();
      const name = normalizeString(project.name).slice(0, 191);
      if (!name) return null;

      const coverImageUrlRaw = normalizeString(project.coverImageUrl);
      return {
        id,
        name,
        createdAt: normalizeDateIso(project.createdAt),
        coverImageUrl: coverImageUrlRaw ? coverImageUrlRaw.slice(0, 2048) : null,
        imageIds: normalizeStringList(project.imageIds),
        videoIds: normalizeStringList(project.videoIds),
      } satisfies ProjectPayload;
    })
    .filter((project): project is ProjectPayload => Boolean(project));
}

function mapProjects(
  projectRows: ProjectRow[],
  imageRows: ProjectImageRow[],
  videoRows: ProjectVideoRow[]
): ProjectPayload[] {
  const projects = projectRows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : normalizeDateIso(row.createdAt),
    coverImageUrl: row.coverImageUrl || null,
    imageIds: [] as string[],
    videoIds: [] as string[],
  }));

  const map = new Map(projects.map((project) => [project.id, project]));

  for (const image of imageRows) {
    const target = map.get(image.projectId);
    if (!target) continue;
    if (!target.imageIds.includes(image.imageId)) {
      target.imageIds.push(image.imageId);
    }
  }

  for (const video of videoRows) {
    const target = map.get(video.projectId);
    if (!target) continue;
    if (!target.videoIds.includes(video.videoId)) {
      target.videoIds.push(video.videoId);
    }
  }

  return projects.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function ensureProjectTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${PROJECTS_TABLE} (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      cover_image_url VARCHAR(2048) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${PROJECT_IMAGES_TABLE} (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      project_id VARCHAR(191) NOT NULL,
      image_id VARCHAR(191) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_project_image (project_id, image_id),
      INDEX idx_image_id (image_id),
      CONSTRAINT fk_media_project_image_project
        FOREIGN KEY (project_id) REFERENCES ${PROJECTS_TABLE}(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${PROJECT_VIDEOS_TABLE} (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      project_id VARCHAR(191) NOT NULL,
      video_id VARCHAR(191) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_project_video (project_id, video_id),
      INDEX idx_video_id (video_id),
      CONSTRAINT fk_media_project_video_project
        FOREIGN KEY (project_id) REFERENCES ${PROJECTS_TABLE}(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function readAllProjects(): Promise<ProjectPayload[]> {
  await ensureProjectTables();

  const [projectRowsRaw, imageRowsRaw, videoRowsRaw] = await prisma.$transaction([
    prisma.$queryRawUnsafe(`
      SELECT
        id,
        name,
        created_at AS createdAt,
        cover_image_url AS coverImageUrl
      FROM ${PROJECTS_TABLE}
      ORDER BY created_at DESC
    `),
    prisma.$queryRawUnsafe(`
      SELECT
        project_id AS projectId,
        image_id AS imageId
      FROM ${PROJECT_IMAGES_TABLE}
      ORDER BY created_at ASC
    `),
    prisma.$queryRawUnsafe(`
      SELECT
        project_id AS projectId,
        video_id AS videoId
      FROM ${PROJECT_VIDEOS_TABLE}
      ORDER BY created_at ASC
    `),
  ]);

  return mapProjects(
    (projectRowsRaw as ProjectRow[]) || [],
    (imageRowsRaw as ProjectImageRow[]) || [],
    (videoRowsRaw as ProjectVideoRow[]) || []
  );
}

async function replaceAllProjects(projects: ProjectPayload[]) {
  await ensureProjectTables();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`DELETE FROM ${PROJECT_IMAGES_TABLE}`);
    await tx.$executeRawUnsafe(`DELETE FROM ${PROJECT_VIDEOS_TABLE}`);
    await tx.$executeRawUnsafe(`DELETE FROM ${PROJECTS_TABLE}`);

    for (const project of projects) {
      const createdAtIso = normalizeDateIso(project.createdAt);
      await tx.$executeRawUnsafe(
        `INSERT INTO ${PROJECTS_TABLE} (id, name, cover_image_url, created_at) VALUES (?, ?, ?, ?)`,
        project.id,
        project.name,
        project.coverImageUrl,
        createdAtIso
      );

      for (const imageId of project.imageIds) {
        await tx.$executeRawUnsafe(
          `INSERT INTO ${PROJECT_IMAGES_TABLE} (id, project_id, image_id, created_at) VALUES (?, ?, ?, ?)`,
          createId(),
          project.id,
          imageId,
          createdAtIso
        );
      }

      for (const videoId of project.videoIds) {
        await tx.$executeRawUnsafe(
          `INSERT INTO ${PROJECT_VIDEOS_TABLE} (id, project_id, video_id, created_at) VALUES (?, ?, ?, ?)`,
          createId(),
          project.id,
          videoId,
          createdAtIso
        );
      }
    }
  });
}

export async function GET() {
  try {
    const projects = await readAllProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel carregar os projetos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { projects?: unknown };
    const projects = normalizeProjectsPayload(payload.projects);

    await replaceAllProjects(projects);
    const saved = await readAllProjects();
    return NextResponse.json({ ok: true, projects: saved });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel salvar os projetos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
