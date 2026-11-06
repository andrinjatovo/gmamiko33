// Server-only logic for the courses app. Never imported from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ItemType = "image" | "pdf" | "word" | "link" | "text";

export type PublicFolder = {
  id: string;
  name: string;
  protected: boolean;
  position: number;
};

export type ItemRow = {
  id: string;
  block_id: string;
  type: ItemType;
  title: string | null;
  content: string | null;
  url: string | null;
  position: number;
  signedUrl?: string | null;
};

export type BlockWithItems = {
  id: string;
  name: string;
  position: number;
  items: ItemRow[];
};

export function assertAdmin(code: string) {
  const expected = process.env['ADMIN_ACCESS_CODE'];
  if (!expected || !code || code !== expected) throw new Error("Code administrateur incorrect.");
}

export async function listFolders(): Promise<PublicFolder[]> {
  const { data, error } = await supabaseAdmin
    .from("folders")
    .select("id, name, access_code, position")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    protected: Boolean(f.access_code && f.access_code.length > 0),
    position: f.position,
  }));
}

export const QUOTA_MESSAGE =
  "Le nombre maximal d'utilisateurs autorisés pour ce dossier a été atteint.";

export async function folderStudents(folderId: string) {
  const { data, error } = await supabaseAdmin
    .from("folder_students")
    .select("id, student_name, created_at")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function removeFolderStudent(id: string) {
  const { error } = await supabaseAdmin.from("folder_students").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function resetFolderStudents(folderId: string) {
  const { error } = await supabaseAdmin.from("folder_students").delete().eq("folder_id", folderId);
  if (error) throw new Error(error.message);
}

async function ensureStudentAccess(
  folder: { id: string; access_code: string | null; max_users: number | null },
  code: string | null,
  studentName: string | null,
) {
  if (!folder.access_code) return;
  const name = (studentName ?? "").trim();
  if (!name) throw new Error("Veuillez d'abord créer votre profil étudiant.");

  const existing = await folderStudents(folder.id);
  const already = existing.find((s) => s.student_name.toLowerCase() === name.toLowerCase());
  if (already) return;

  if (folder.access_code !== code) throw new Error("Code incorrect.");
  if (folder.max_users !== null && existing.length >= folder.max_users) {
    throw new Error(QUOTA_MESSAGE);
  }

  const { error } = await supabaseAdmin
    .from("folder_students")
    .insert({ folder_id: folder.id, student_name: name });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
}

export async function listMessages() {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id, author_name, is_admin, body, created_at")
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function postMessage(authorName: string, body: string, isAdmin: boolean) {
  const text = body.trim().slice(0, 2000);
  const name = authorName.trim().slice(0, 60);
  if (!text) throw new Error("Message vide.");
  if (!name) throw new Error("Nom requis.");
  const { error } = await supabaseAdmin
    .from("messages")
    .insert({ author_name: name, body: text, is_admin: isAdmin });
  if (error) throw new Error(error.message);
}

export async function deleteMessage(id: string) {
  const { error } = await supabaseAdmin.from("messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function clearMessages() {
  const { error } = await supabaseAdmin.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(error.message);
}


export async function signUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabaseAdmin.storage.from("media").createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

export async function getFolderContent(
  folderId: string,
  code: string | null,
  adminCode: string | null,
  studentName: string | null = null,
) {
  const { data: folder, error } = await supabaseAdmin
    .from("folders")
    .select("id, name, access_code, max_users")
    .eq("id", folderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!folder) throw new Error("Dossier introuvable.");

  const isAdmin = adminCode === ADMIN_CODE;
  if (!isAdmin) {
    await ensureStudentAccess(folder, code, studentName);
  }


  const { data: blocks } = await supabaseAdmin
    .from("blocks")
    .select("id, name, position")
    .eq("folder_id", folderId)
    .order("position", { ascending: true });

  const blockIds = (blocks ?? []).map((b) => b.id);
  let items: ItemRow[] = [];
  if (blockIds.length) {
    const { data: rows } = await supabaseAdmin
      .from("items")
      .select("id, block_id, type, title, content, url, position")
      .in("block_id", blockIds)
      .order("position", { ascending: true });
    items = await Promise.all(
      (rows ?? []).map(async (r) => ({
        ...(r as ItemRow),
        signedUrl: r.type === "link" || r.type === "text" ? r.url : await signUrl(r.url),
      })),
    );
  }

  const blocksWithItems: BlockWithItems[] = (blocks ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    position: b.position,
    items: items.filter((i) => i.block_id === b.id),
  }));

  const used = folder.access_code ? (await folderStudents(folderId)).length : 0;

  return {
    folder: {
      id: folder.id,
      name: folder.name,
      protected: Boolean(folder.access_code),
      accessCode: isAdmin ? (folder.access_code ?? "") : undefined,
      maxUsers: isAdmin ? folder.max_users : undefined,
      used: isAdmin ? used : undefined,
    },
    blocks: blocksWithItems,
  };
}

export async function nextPosition(table: "folders" | "blocks" | "items", parent?: { column: string; value: string }) {
  let query = supabaseAdmin.from(table).select("position").order("position", { ascending: false }).limit(1);
  if (parent) query = query.eq(parent.column, parent.value) as typeof query;
  const { data } = await query;
  return ((data?.[0]?.position ?? -1) as number) + 1;
}

export async function createFolder(name: string, accessCode: string, maxUsers: number | null) {
  const position = await nextPosition("folders");
  const { error } = await supabaseAdmin
    .from("folders")
    .insert({ name, access_code: accessCode || null, max_users: accessCode ? maxUsers : null, position });
  if (error) throw new Error(error.message);
}

export async function updateFolder(id: string, name: string, accessCode: string, maxUsers: number | null) {
  const { error } = await supabaseAdmin
    .from("folders")
    .update({ name, access_code: accessCode || null, max_users: accessCode ? maxUsers : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}


export async function removeRow(table: "folders" | "blocks" | "items", id: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createBlock(folderId: string, name: string) {
  const position = await nextPosition("blocks", { column: "folder_id", value: folderId });
  const { error } = await supabaseAdmin.from("blocks").insert({ folder_id: folderId, name, position });
  if (error) throw new Error(error.message);
}

export async function renameBlock(id: string, name: string) {
  const { error } = await supabaseAdmin.from("blocks").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorder(table: "folders" | "blocks" | "items", ids: string[]) {
  for (let i = 0; i < ids.length; i++) {
    await supabaseAdmin.from(table).update({ position: i }).eq("id", ids[i]!);
  }
}

export async function createItem(input: {
  blockId: string;
  type: ItemType;
  title: string | null;
  content: string | null;
  url: string | null;
}) {
  const position = await nextPosition("items", { column: "block_id", value: input.blockId });
  const { error } = await supabaseAdmin.from("items").insert({
    block_id: input.blockId,
    type: input.type,
    title: input.title,
    content: input.content,
    url: input.url,
    position,
  });
  if (error) throw new Error(error.message);
}

export async function updateItem(input: {
  id: string;
  title: string | null;
  content: string | null;
  url: string | null;
}) {
  const patch: { title: string | null; content: string | null; url?: string | null } = {
    title: input.title,
    content: input.content,
  };
  if (input.url !== null) patch.url = input.url;
  const { error } = await supabaseAdmin.from("items").update(patch).eq("id", input.id);
  if (error) throw new Error(error.message);
}

export async function createUpload(fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${crypto.randomUUID()}-${safe}`;
  const { data, error } = await supabaseAdmin.storage.from("media").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Upload impossible.");
  return { path, token: data.token, signedUrl: data.signedUrl };
}

export async function folderSecurity(folderId: string) {
  const { data, error } = await supabaseAdmin
    .from("folders")
    .select("id, name, access_code, max_users")
    .eq("id", folderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Dossier introuvable.");
  const students = await folderStudents(folderId);
  return {
    accessCode: data.access_code ?? "",
    maxUsers: data.max_users,
    used: students.length,
    remaining: data.max_users === null ? null : Math.max(0, data.max_users - students.length),
    students,
  };
}
