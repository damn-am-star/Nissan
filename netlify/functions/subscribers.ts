import type { Config } from "@netlify/functions";
import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { newsletterSubscribers } from "../../db/schema.js";

export default async (req: Request) => {
  if (req.method === "GET") {
    const subscribers = await db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt));
    return Response.json({ count: subscribers.length, subscribers });
  }

  if (req.method === "POST") {
    const { email } = (await req.json()) as { email?: string };
    if (!email || typeof email !== "string") {
      return Response.json({ error: "email is required" }, { status: 400 });
    }
    try {
      const [created] = await db
        .insert(newsletterSubscribers)
        .values({ email })
        .returning();
      return Response.json(created, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Insert failed";
      if (message.includes("unique") || message.includes("duplicate")) {
        return Response.json({ error: "email already subscribed" }, { status: 409 });
      }
      return Response.json({ error: message }, { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/subscribers",
};
