import { eq } from "drizzle-orm";
import { z } from "zod";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getDb } from "@/server/db/client";
import { userProfiles } from "@/server/db/schema";

const profileSchema = z.object({
  nickname: z.string().trim().min(2).max(20),
  bio: z.string().trim().max(120).default(""),
  avatarUrl: z.union([z.string().url().max(500), z.literal("")]).default(""),
});

export async function PUT(request: Request) {
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  if (!data.user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "INVALID_PROFILE" }, { status: 400 });
  const values = { userId: data.user.id, nickname: parsed.data.nickname, bio: parsed.data.bio, avatarUrl: parsed.data.avatarUrl || null, updatedAt: new Date() };
  try {
    const [profile] = await getDb().insert(userProfiles).values(values).onConflictDoUpdate({ target: userProfiles.userId, set: values }).returning();
    return Response.json(profile);
  } catch {
    return Response.json({ error: "NICKNAME_TAKEN" }, { status: 409 });
  }
}
