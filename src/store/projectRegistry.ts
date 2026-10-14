import { del, get, set } from "idb-keyval";
import type { PersistStorage } from "zustand/middleware";

import { collectBlobKeys, joinBlobs, splitBlobs, type StoredBlob } from "./blobStorage";

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
}

const INDEX_KEY = "shelfshot:projects";
const ACTIVE_KEY = "shelfshot:active-project";
const projectKey = (id: string) => `shelfshot:project:${id}`;
const blobKey = (key: string) => `shelfshot:blob:${key}`;

export function nextProjectName(projects: ProjectMeta[]): string {
  const used = new Set(projects.map((p) => p.name));
  for (let n = projects.length + 1; ; n++) {
    if (!used.has(`Project ${n}`)) return `Project ${n}`;
  }
}

export function newProject(projects: ProjectMeta[]): ProjectMeta {
  return { id: crypto.randomUUID(), name: nextProjectName(projects), createdAt: Date.now() };
}

export function renameProjectIn(projects: ProjectMeta[], id: string, name: string): ProjectMeta[] {
  const trimmed = name.trim();
  if (!trimmed) return projects;
  return projects.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
}

export async function readIndex(): Promise<ProjectMeta[]> {
  return (await get<ProjectMeta[]>(INDEX_KEY)) ?? [];
}

export async function writeIndex(projects: ProjectMeta[]): Promise<void> {
  await set(INDEX_KEY, projects);
}

export function readActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeActiveId(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
}

let currentId: string | null = null;
let paused = false;
let pending: { id: string; value: unknown } | null = null;
let queue: Promise<void> = Promise.resolve();
const storedBlobKeys = new Map<string, Set<string>>();

function enqueue(task: () => Promise<void>): Promise<void> {
  queue = queue.catch(() => undefined).then(task);
  return queue;
}

async function saveBlob(key: string, blob: Blob) {
  try {
    await set(blobKey(key), blob);
  } catch {
    await set(blobKey(key), { bytes: await blob.arrayBuffer(), type: blob.type } satisfies StoredBlob);
  }
}

async function saveProject(id: string, value: unknown) {
  const { packed, blobs } = splitBlobs(value);
  const known = storedBlobKeys.get(id) ?? new Set<string>();

  await Promise.all([...blobs].filter(([key]) => !known.has(key)).map(([key, blob]) => saveBlob(key, blob)));
  await set(projectKey(id), packed);

  const current = new Set(blobs.keys());
  await Promise.all([...known].filter((key) => !current.has(key)).map((key) => del(blobKey(key))));
  storedBlobKeys.set(id, current);
}

export function flushPersistence(): Promise<void> {
  return enqueue(async () => {
    const job = pending;
    pending = null;
    if (job) await saveProject(job.id, job.value);
  });
}

function saveInBackground() {
  flushPersistence().catch((error) => console.error("Could not save the project", error));
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", saveInBackground);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveInBackground();
  });
}

export async function deleteProjectData(id: string): Promise<void> {
  if (pending?.id === id) pending = null;
  await queue;
  const saved = await get(projectKey(id));
  await Promise.all(collectBlobKeys(saved).map((key) => del(blobKey(key))));
  storedBlobKeys.delete(id);
  await del(projectKey(id));
}

export function setCurrentProject(id: string) {
  currentId = id;
  writeActiveId(id);
}

export function pausePersistence(isPaused: boolean) {
  paused = isPaused;
}

export const projectStorage = <T>(): PersistStorage<T> => ({
  getItem: async () => {
    if (!currentId) return null;
    const id = currentId;
    await queue;
    const saved = await get(projectKey(id));
    if (!saved) return null;
    storedBlobKeys.set(id, new Set(collectBlobKeys(saved)));
    return joinBlobs(saved, (key) => get<Blob | StoredBlob>(blobKey(key)));
  },
  setItem: async (_name, value) => {
    if (!currentId || paused) return;
    pending = { id: currentId, value };
    saveInBackground();
  },
  removeItem: async () => {
    if (currentId) await deleteProjectData(currentId);
  },
});
