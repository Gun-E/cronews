"use client";

import { useRef, useState } from "react";

async function compressAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size > 8_000_000) throw new Error("8MB 이하의 이미지 파일을 선택해 주세요.");
  const bitmap = await createImageBitmap(file);
  const size = 320, side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
  canvas.getContext("2d")?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("이미지를 처리하지 못했습니다.")), "image/webp", .82));
}

export function ProfileMenu({ nickname, bio = "", avatarUrl }: { nickname: string; bio?: string; avatarUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(nickname);
  const [intro, setIntro] = useState(bio);
  const [avatar, setAvatar] = useState(avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = [...name][0]?.toUpperCase() ?? "C";
  const save = async () => {
    setSaving(true); setMessage("");
    const response = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: name, bio: intro, avatarUrl: avatar }) });
    if (response.ok) { setOpen(false); window.location.reload(); }
    else setMessage(response.status === 409 ? "이미 사용 중인 닉네임입니다." : "프로필을 저장하지 못했습니다.");
    setSaving(false);
  };
  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    setUploading(true); setMessage("");
    try {
      const compressed = await compressAvatar(file);
      const form = new FormData(); form.append("avatar", compressed, "avatar.webp");
      const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
      if (!response.ok) throw new Error("사진을 업로드하지 못했습니다.");
      const result = await response.json() as { url: string };
      setAvatar(result.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "사진을 업로드하지 못했습니다."); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  return <>
    <button type="button" className="profile-trigger" onClick={() => setOpen(true)}>{avatar ? <img src={avatar} alt="" /> : <span>{initial}</span>}<b>{nickname}</b></button>
    {open && <div className="modal-backdrop"><div className="result-card profile-modal" role="dialog" aria-modal="true"><button className="close" onClick={() => setOpen(false)}>×</button><span className="eyebrow">MY PROFILE</span><h2>프로필 편집</h2><div className="profile-preview">{avatar ? <img src={avatar} alt="프로필 미리보기" /> : <span>{initial}</span>}</div><input ref={fileRef} className="avatar-file-input" type="file" accept="image/*" onChange={(event) => void uploadAvatar(event.target.files?.[0])} /><button type="button" className="avatar-upload-button" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "사진 처리 중…" : "사진 선택"}</button><p className="avatar-help">갤러리 또는 파일에서 선택하면 320px로 자동 압축됩니다.</p><label>닉네임<input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} /></label><label>본인 소개<textarea value={intro} maxLength={120} rows={3} placeholder="나를 소개해 주세요" onChange={(event) => setIntro(event.target.value)} /><small>{intro.length}/120</small></label>{message && <p className="error">{message}</p>}<button className="submit" onClick={save} disabled={saving || uploading || name.trim().length < 2}>{saving ? "저장 중…" : "프로필 저장"}</button></div></div>}
  </>;
}
