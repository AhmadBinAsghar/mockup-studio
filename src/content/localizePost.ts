import type { Translator } from "@/i18n/store";

import type { Post } from "./posts";

/** The post in the given interface language; any part without a translation stays English. */
export function localizePost(post: Post, { tf }: Pick<Translator, "tf">): Post {
  const key = `post.${post.slug}`;
  return {
    ...post,
    title: tf(`${key}.title`, post.title),
    description: tf(`${key}.description`, post.description),
    sections: post.sections.map((s, i) => ({
      heading: tf(`${key}.s${i}.heading`, s.heading),
      paragraphs: s.paragraphs.map((p, j) => tf(`${key}.s${i}.p${j}`, p)),
      list: s.list?.map((item, k) => tf(`${key}.s${i}.l${k}`, item)),
    })),
  };
}
