import type { Context } from "@netlify/edge-functions";

const UPSTREAM = "https://api.hiro.so";

export default async (req: Request, _ctx: Context): Promise<Response> => {
  const url = new URL(req.url);
  const upstreamUrl = UPSTREAM + url.pathname.replace(/^\/hiro/, "") + url.search;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("cookie");
  const apiKey = Netlify.env.get("HIRO_API_KEY");
  if (apiKey) headers.set("x-api-key", apiKey);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  return fetch(upstreamUrl, init);
};

export const config = { path: "/hiro/*" };
