import { Fragment, type ReactNode } from "react";

import type { Params, Translator } from "./store";

type Tags = Record<string, (children: string) => ReactNode>;

/**
 * Translates a message that contains inline markup such as `see our <privacy>Privacy Policy</privacy>`,
 * so links keep working in every language no matter where the translator puts them.
 */
export function tRich(tr: Pick<Translator, "t">, key: string, tags: Tags, params?: Params): ReactNode {
  const text = tr.t(key, params);
  const parts: ReactNode[] = [];
  const re = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const render = tags[match[1]];
    parts.push(render ? render(match[2]) : match[2]);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}
