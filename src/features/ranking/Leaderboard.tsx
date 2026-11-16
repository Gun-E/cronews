"use client";

import { useEffect, useState } from "react";

export type RankRow = { userId: string | null; displayName: string; avatarUrl: string | null; bio: string; score: number; detail: string };

function Avatar({ row }: { row: RankRow }) { return row.avatarUrl ? <img src={row.avatarUrl} alt="" /> : <span>{[...row.displayName][0]?.toUpperCase() ?? "C"}</span>; }

export function Leaderboard({ rows, currentUserId, overall }: { rows: RankRow[]; currentUserId?: string; overall: boolean }) {
  const [profile, setProfile] = useState<RankRow | null>(null);
  useEffect(() => {
    if (!profile) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setProfile(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [profile]);
  const showProfile = (row: RankRow) => row.userId && setProfile(row);
  const metric = overall ? "누적 완주" : "풀이 기록";
  return <>
    {rows.length ? <>
      <div className="ranking-leaders" aria-label="상위 세 명">
        {rows.slice(0, 3).map((row, index) => {
          const content = <>
            <span className="leader-place">{index + 1}위</span>
            <span className="mini-avatar"><Avatar row={row} /></span>
            <strong>{row.displayName}{row.userId && row.userId === currentUserId && <small>나</small>}</strong>
            <span className="leader-detail">{row.detail}</span>
          </>;
          return row.userId
            ? <button type="button" className="leader-card" key={index} onClick={() => showProfile(row)}>{content}</button>
            : <div className="leader-card" key={index}>{content}</div>;
        })}
      </div>
      {rows.length > 3 && <section className="ranking-results" aria-label="전체 순위">
        <div className="ranking-results-heading"><span>순위</span><span>플레이어</span><span>{metric}</span></div>
        <ol className="ranking-records" start={4}>
          {rows.slice(3).map((row, index) => <li key={`${row.userId}:${index}`} className={row.userId && row.userId === currentUserId ? "mine" : undefined}>
            <span className="record-position">{index + 4}</span>
            <button type="button" className="rank-player" onClick={() => showProfile(row)} disabled={!row.userId}>
              <span className="mini-avatar"><Avatar row={row} /></span><span>{row.displayName}</span>
              {row.userId && row.userId === currentUserId && <small>나</small>}
            </button>
            <span className="leader-detail">{row.detail}</span>
          </li>)}
        </ol>
      </section>}
    </> : <div className="empty-ranking">아직 기록이 없습니다.</div>}
    {profile && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfile(null); }}><div className="result-card public-profile-modal" role="dialog" aria-modal="true" aria-labelledby="public-profile-name"><button className="close" onClick={() => setProfile(null)} aria-label="프로필 닫기">×</button><span className="eyebrow">PLAYER PROFILE</span><div className="public-profile-avatar"><Avatar row={profile} /></div><h2 id="public-profile-name">{profile.displayName}</h2><p>{profile.bio || "아직 작성한 소개가 없습니다."}</p><div className="public-profile-record"><span>랭킹 기록</span><strong>{profile.detail}</strong></div></div></div>}
  </>;
}
