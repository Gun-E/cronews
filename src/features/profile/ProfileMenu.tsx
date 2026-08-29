"use client";

import { useState } from "react";

export function ProfileMenu({ nickname, bio = "", avatarUrl }: { nickname: string; bio?: string; avatarUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(nickname);
  const [intro, setIntro] = useState(bio);
  const [avatar, setAvatar] = useState(avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const initial = [...name][0]?.toUpperCase() ?? "C";
  const save = async () => {
    setSaving(true); setMessage("");
    const response = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: name, bio: intro, avatarUrl: avatar }) });
    if (response.ok) { setOpen(false); window.location.reload(); }
    else setMessage(response.status === 409 ? "이미 사용 중인 닉네임입니다." : "프로필을 저장하지 못했습니다.");
    setSaving(false);
  };
  return <>
    <button type="button" className="profile-trigger" onClick={() => setOpen(true)}>{avatar ? <img src={avatar} alt="" /> : <span>{initial}</span>}<b>{nickname}</b></button>
    {open && <div className="modal-backdrop"><div className="result-card profile-modal" role="dialog" aria-modal="true"><button className="close" onClick={() => setOpen(false)}>×</button><span className="eyebrow">MY PROFILE</span><h2>프로필 편집</h2><div className="profile-preview">{avatar ? <img src={avatar} alt="프로필 미리보기" /> : <span>{initial}</span>}</div><label>닉네임<input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} /></label><label>프로필 사진 URL<input value={avatar} inputMode="url" placeholder="https://..." onChange={(event) => setAvatar(event.target.value)} /></label><label>본인 소개<textarea value={intro} maxLength={120} rows={3} placeholder="나를 소개해 주세요" onChange={(event) => setIntro(event.target.value)} /><small>{intro.length}/120</small></label>{message && <p className="error">{message}</p>}<button className="submit" onClick={save} disabled={saving || name.trim().length < 2}>{saving ? "저장 중…" : "프로필 저장"}</button></div></div>}
  </>;
}
