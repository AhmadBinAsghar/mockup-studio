"use client";

import { FolderOpen, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FIRST_STEP_PATH } from "@/config/steps";
import type { ProjectMeta } from "@/store/projectRegistry";
import { useProjects } from "@/store/useProjects";

type Mode = "idle" | "renaming" | "confirmingDelete";

function ProjectRow({
  project,
  active,
  onDone,
}: {
  project: ProjectMeta;
  active: boolean;
  onDone: () => void;
}) {
  const { open, rename, remove } = useProjects();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState(project.name);

  async function openProject() {
    await open(project.id);
    router.push(FIRST_STEP_PATH);
    onDone();
  }

  async function submitRename() {
    await rename(project.id, name);
    setMode("idle");
  }

  async function deleteProject() {
    await remove(project.id);
    router.push(FIRST_STEP_PATH);
    onDone();
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border p-2">
      {mode === "renaming" ? (
        <>
          <Input
            aria-label="Project name"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
          />
          <Button size="sm" onClick={submitRename}>
            Save
          </Button>
        </>
      ) : (
        <>
          <Button
            variant={active ? "secondary" : "ghost"}
            className="min-w-0 flex-1 justify-start"
            aria-current={active}
            onClick={openProject}
          >
            <span className="truncate">{project.name}</span>
            {active && <span className="text-xs text-muted-foreground">(open)</span>}
          </Button>
          {mode === "confirmingDelete" ? (
            <>
              <Button size="sm" variant="destructive" onClick={deleteProject}>
                Confirm delete
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode("idle")}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setMode("renaming")}>
                Rename
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setMode("confirmingDelete")}
              >
                Delete
              </Button>
            </>
          )}
        </>
      )}
    </li>
  );
}

export function ProjectSwitcher() {
  const router = useRouter();
  const { projects, activeId, create } = useProjects();
  const [open, setOpen] = useState(false);
  const current = projects.find((p) => p.id === activeId);

  async function createProject() {
    await create();
    router.push(FIRST_STEP_PATH);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <FolderOpen />
            <span className="max-w-40 truncate">{current?.name ?? "Projects"}</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Projects</DialogTitle>
          <DialogDescription>
            Each project keeps its own screenshots and settings, saved in this browser.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {projects.map((p) => (
            <ProjectRow key={p.id} project={p} active={p.id === activeId} onDone={() => setOpen(false)} />
          ))}
        </ul>
        <Button onClick={createProject}>
          <Plus /> New project
        </Button>
      </DialogContent>
    </Dialog>
  );
}
