import { getStore } from "@netlify/blobs";

const MAX = 8;
const str = (v, n) => String(v ?? "").trim().slice(0, n);
const pairs = (arr, max) =>
  (Array.isArray(arr) ? arr : []).slice(0, max).map((p) => [str(p?.[0], 30), str(p?.[1], 30)]);

export default async (req) => {
  const store = getStore("teams");
  const id = new URL(req.url).searchParams.get("id");
  const json = (d, s = 200) =>
    new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const items = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    return json(items.filter(Boolean).sort((a, b) => a.ts - b.ts));
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const name = str(body.name, 30);
    if (!name) return json({ error: "name" }, 400);
    const { blobs } = await store.list();
    if (blobs.length >= MAX) return json({ error: "full" }, 409);
    const team = {
      id: crypto.randomUUID(),
      name,
      members: pairs(body.members, 5),
      subs: pairs(body.subs, 2),
      ts: Date.now(),
    };
    await store.setJSON(team.id, team);
    return json(team, 201);
  }

  if (!id) return json({ error: "id" }, 400);

  if (req.method === "PUT") {
    const old = await store.get(id, { type: "json" });
    if (!old) return json({ error: "notfound" }, 404);
    const body = await req.json().catch(() => ({}));
    const team = {
      ...old,
      name: str(body.name, 30) || old.name,
      members: body.members ? pairs(body.members, 5) : old.members,
      subs: body.subs ? pairs(body.subs, 2) : old.subs,
    };
    await store.setJSON(id, team);
    return json(team);
  }

  if (req.method === "DELETE") {
    await store.delete(id);
    return json({ ok: true });
  }

  return json({ error: "method" }, 405);
};

export const config = { path: "/api/teams" };
