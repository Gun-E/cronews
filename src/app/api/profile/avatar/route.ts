import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/server/auth/supabase";

const BUCKET = "profile-avatars";

export async function POST(request: Request) {
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  if (!data.user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("avatar");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 500_000) return Response.json({ error: "INVALID_IMAGE" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_DATABASE_SUPABASE_URL;
  const serviceKey = process.env.DATABASE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.DATABASE_SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) return Response.json({ error: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error } = await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 500_000, allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"] });
    if (error && !/already exists/i.test(error.message)) return Response.json({ error: "BUCKET_CREATE_FAILED" }, { status: 500 });
  }
  const path = `${data.user.id}/avatar.webp`;
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: "image/webp", cacheControl: "3600" });
  if (error) return Response.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(path);
  return Response.json({ url: `${publicUrl.publicUrl}?v=${Date.now()}` });
}
