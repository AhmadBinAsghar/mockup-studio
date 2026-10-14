"use client";

import { create } from "zustand";

import {
  deleteProjectData,
  flushPersistence,
  newProject,
  pausePersistence,
  readActiveId,
  readIndex,
  renameProjectIn,
  setCurrentProject,
  writeIndex,
  type ProjectMeta,
} from "./projectRegistry";
import { createInitialProject, useProject } from "./useProject";

interface ProjectsState {
  projects: ProjectMeta[];
  activeId: string | null;
  init: () => Promise<void>;
  create: () => Promise<void>;
  open: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

async function loadIntoStore(id: string) {
  await flushPersistence();
  pausePersistence(true);
  try {
    setCurrentProject(id);
    useProject.setState({ ...createInitialProject(), hydrated: false });
    await useProject.persist.rehydrate();
  } finally {
    pausePersistence(false);
  }
}

export const useProjects = create<ProjectsState>()((set, get) => ({
  projects: [],
  activeId: null,

  init: async () => {
    let projects = await readIndex();
    if (projects.length === 0) {
      projects = [newProject([])];
      await writeIndex(projects);
    }
    const saved = readActiveId();
    const activeId = projects.find((p) => p.id === saved)?.id ?? projects[0].id;
    await loadIntoStore(activeId);
    set({ projects, activeId });
  },

  create: async () => {
    const project = newProject(get().projects);
    const projects = [...get().projects, project];
    await writeIndex(projects);
    await loadIntoStore(project.id);
    set({ projects, activeId: project.id });
  },

  open: async (id) => {
    if (id === get().activeId) return;
    await loadIntoStore(id);
    set({ activeId: id });
  },

  rename: async (id, name) => {
    const projects = renameProjectIn(get().projects, id, name);
    await writeIndex(projects);
    set({ projects });
  },

  remove: async (id) => {
    const remaining = get().projects.filter((p) => p.id !== id);
    await deleteProjectData(id);
    if (remaining.length === 0) {
      const fresh = newProject([]);
      await writeIndex([fresh]);
      await loadIntoStore(fresh.id);
      set({ projects: [fresh], activeId: fresh.id });
      return;
    }
    await writeIndex(remaining);
    set({ projects: remaining });
    if (id === get().activeId) {
      await loadIntoStore(remaining[0].id);
      set({ activeId: remaining[0].id });
    }
  },
}));
