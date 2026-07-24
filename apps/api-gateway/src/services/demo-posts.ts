import { randomUUID } from "node:crypto";
import type { DemoPost } from "../db/memory-store.js";
import { memoryStore } from "../db/memory-store.js";

const SEED_POSTS: DemoPost[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    title: "Welcome to the PQC Blog",
    body: "Published posts from the demo API are mapped into cards at runtime.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    title: "Quantum-safe by design",
    body: "Each card is cloned from the blogCard template when new posts arrive.",
    createdAt: new Date().toISOString(),
  },
];

let seeded = false;

function ensureSeed() {
  if (seeded || memoryStore.demoPosts.length > 0) return;
  memoryStore.demoPosts.push(...SEED_POSTS.map((p) => ({ ...p })));
  seeded = true;
}

export function listDemoPosts(): DemoPost[] {
  ensureSeed();
  return [...memoryStore.demoPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function createDemoPost(input: { title: string; body: string }): DemoPost {
  ensureSeed();
  const post: DemoPost = {
    id: randomUUID(),
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  memoryStore.demoPosts.push(post);
  return post;
}

export function resetDemoPostsForTests() {
  memoryStore.demoPosts.length = 0;
  seeded = false;
}
