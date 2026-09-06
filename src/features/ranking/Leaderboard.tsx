"use client";

import { useEffect, useState } from "react";

export type RankRow = { userId: string | null; displayName: string; avatarUrl: string | null; bio: string; score: number; detail: string };

function Avatar({ row }: { row: RankRow }) { return row.avatarUrl ? <img src={row.avatarUrl} alt="" /> : <span>{[...row.displayName][0]?.toUpperCase() ?? "C"}</span>; }

export function Leaderboard({ rows, currentUserId }: { rows: RankRow[]; currentUserId?: string }) {
  const [profile, setProfile] = useState<RankRow | null>(null);
  useEffect(() => {
    if (!profile) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setProfile(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [profile]);
  const showProfile = (row: RankRow) => row.userId && setProfile(row);
  const podiumOrder = [rows[1], rows[0], rows[2]].filter(Boolean);
  return <>
    {rows.length ? <><div className="podium">{podiumOrder.map((row) => { const rank = rows.indexOf(row) + 1; return <button type="button" key={`${row.userId}:${rank}`} className={`podium-rank rank-${rank} ${row.userId ? "profile-openable" : ""}`} onClick={() => showProfile(row)}><div className="crown">{rank === 1 ? "♛" : rank === 2 ? "◆" : "●"}</div><div className="podium-avatar"><Avatar row={row} /></div><strong>{row.displayName}</strong><b>{rank}위</b><small>{row.detail}</small></button>; })}</div><ol className="ranking-list game-ranking">{rows.slice(3).map((row, index) => <li key={`${row.userId}:${index}`} className={row.userId === currentUserId ? "mine" : ""}><strong>{index + 4}</strong><button type="button" className="rank-player" onClick={() => showProfile(row)} disabled={!row.userId}><div className="mini-avatar"><Avatar row={row} /></div><span>{row.displayName}{row.userId === currentUserId && <small>나</small>}</span></button><b>{row.score.toLocaleString()}</b><time>{row.detail}</time></li>)}</ol></> : <div className="empty-ranking">아직 기록이 없습니다. 첫 번째 주인공이 되어보세요.</div>}
    {profile && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfile(null); }}><div className="result-card public-profile-modal" role="dialog" aria-modal="true" aria-labelledby="public-profile-name"><button className="close" onClick={() => setProfile(null)} aria-label="프로필 닫기">×</button><span className="eyebrow">PLAYER PROFILE</span><div className="public-profile-avatar"><Avatar row={profile} /></div><h2 id="public-profile-name">{profile.displayName}</h2><p>{profile.bio || "아직 작성한 소개가 없습니다."}</p><div className="public-profile-record"><span>랭킹 기록</span><strong>{profile.detail}</strong></div></div></div>}
  </>;
}
