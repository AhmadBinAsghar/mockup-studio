import { describe, expect, it } from "vitest";

import { collectBlobKeys, joinBlobs, splitBlobs, type StoredBlob } from "./blobStorage";

function fakeDatabase() {
  const rows = new Map<string, StoredBlob>();
  return {
    rows,
    save: async (blobs: Map<string, Blob>) => {
      for (const [key, blob] of blobs) rows.set(key, { bytes: await blob.arrayBuffer(), type: blob.type });
    },
    load: async (key: string) => rows.get(key),
  };
}

describe("blob storage", () => {
  it("round-trips Blobs nested in objects and arrays, leaving other values alone", async () => {
    const db = fakeDatabase();
    const state = {
      name: "Project 1",
      slides: [
        { id: "a", blob: new Blob(["hello"], { type: "image/png" }) },
        { id: "b", blob: null },
      ],
    };

    const { packed, blobs } = splitBlobs(state);
    expect(packed.slides[0].blob).not.toBeInstanceOf(Blob);
    expect(blobs.size).toBe(1);
    await db.save(blobs);

    const restored = await joinBlobs(packed, db.load);
    expect(restored.name).toBe("Project 1");
    expect(restored.slides[1].blob).toBeNull();
    const blob = restored.slides[0].blob as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(await blob.text()).toBe("hello");
  });

  it("keeps the same key for the same Blob, so unchanged images are never written twice", () => {
    const blob = new Blob(["x"]);
    const first = splitBlobs({ blob });
    const second = splitBlobs({ blob, other: 1 });
    expect([...first.blobs.keys()]).toEqual([...second.blobs.keys()]);
  });

  it("reuses the saved key after loading, and lists the keys a saved project points to", async () => {
    const db = fakeDatabase();
    const { packed, blobs } = splitBlobs({ slides: [{ blob: new Blob(["a"]) }, { blob: new Blob(["b"]) }] });
    await db.save(blobs);
    const restored = await joinBlobs(packed, db.load);

    expect(collectBlobKeys(packed)).toEqual([...blobs.keys()]);
    expect([...splitBlobs(restored).blobs.keys()]).toEqual([...blobs.keys()]);
  });

  it("uses a stored Blob as it is when the browser can keep Blobs", async () => {
    const saved = new Blob(["native"], { type: "image/png" });
    const restored = await joinBlobs({ blob: { __blobRef: "k", type: "image/png" } }, async () => saved);
    expect(restored.blob).toBe(saved);
  });

  it("still reads projects saved with images inline as bytes", async () => {
    const bytes = new TextEncoder().encode("old").buffer as ArrayBuffer;
    const restored = await joinBlobs({ blob: { __blob: bytes, type: "image/png" } }, async () => undefined);
    expect(await (restored.blob as unknown as Blob).text()).toBe("old");
  });
});
