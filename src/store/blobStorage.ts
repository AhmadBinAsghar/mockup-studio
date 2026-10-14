const BLOB_REF = "__blobRef";
const LEGACY_BLOB = "__blob";

interface BlobRef {
  [BLOB_REF]: string;
  type: string;
}

export interface StoredBlob {
  bytes: ArrayBuffer;
  type: string;
}

const keys = new WeakMap<Blob, string>();

function keyFor(blob: Blob): string {
  let key = keys.get(blob);
  if (!key) {
    key = crypto.randomUUID();
    keys.set(blob, key);
  }
  return key;
}

function isRef(value: unknown): value is BlobRef {
  return typeof value === "object" && value !== null && BLOB_REF in value;
}

function isLegacyBlob(value: unknown): value is { [LEGACY_BLOB]: ArrayBuffer; type: string } {
  return typeof value === "object" && value !== null && LEGACY_BLOB in value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function mapSync(value: unknown, convert: (leaf: unknown) => unknown): unknown {
  const converted = convert(value);
  if (converted !== value) return converted;
  if (Array.isArray(value)) return value.map((item) => mapSync(item, convert));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapSync(item, convert)]));
  }
  return value;
}

async function mapAsync(value: unknown, convert: (leaf: unknown) => Promise<unknown>): Promise<unknown> {
  const converted = await convert(value);
  if (converted !== value) return converted;
  if (Array.isArray(value)) return Promise.all(value.map((item) => mapAsync(item, convert)));
  if (isPlainObject(value)) {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [key, await mapAsync(item, convert)] as const),
    );
    return Object.fromEntries(entries);
  }
  return value;
}

export function splitBlobs<T>(value: T): { packed: T; blobs: Map<string, Blob> } {
  const blobs = new Map<string, Blob>();
  const packed = mapSync(value, (leaf) => {
    if (!(leaf instanceof Blob)) return leaf;
    const key = keyFor(leaf);
    blobs.set(key, leaf);
    return { [BLOB_REF]: key, type: leaf.type } satisfies BlobRef;
  }) as T;
  return { packed, blobs };
}

export async function joinBlobs<T>(
  value: T,
  load: (key: string) => Promise<Blob | StoredBlob | undefined>,
): Promise<T> {
  return mapAsync(value, async (leaf) => {
    if (isLegacyBlob(leaf)) return new Blob([leaf[LEGACY_BLOB]], { type: leaf.type });
    if (!isRef(leaf)) return leaf;
    const stored = await load(leaf[BLOB_REF]);
    const blob =
      stored instanceof Blob
        ? stored
        : new Blob(stored ? [stored.bytes] : [], { type: stored?.type ?? leaf.type });
    keys.set(blob, leaf[BLOB_REF]);
    return blob;
  }) as Promise<T>;
}

export function collectBlobKeys(value: unknown): string[] {
  const found: string[] = [];
  mapSync(value, (leaf) => {
    if (isRef(leaf)) found.push(leaf[BLOB_REF]);
    return leaf;
  });
  return found;
}
