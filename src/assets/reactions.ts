const sources = import.meta.glob("./generated/shared/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const byId = Object.fromEntries(
  Object.entries(sources).map(([file, url]) => {
    const slug = file
      .split("/")
      .at(-1)!
      .replace(/\.webp$/, "");
    const id = ["ok", "maybe", "wrong"].includes(slug)
      ? `asset.core.${slug}`
      : `asset.core.reaction.${slug}`;
    return [id, url];
  }),
);

export function reactionUrl(assetId: string): string | null {
  return byId[assetId] ?? null;
}
