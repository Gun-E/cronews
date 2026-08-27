"use client";

import { useEffect, useMemo, useState } from "react";
import type { PuzzleBoard } from "@/server/puzzle/types";

type Result = { correctCount: number; totalCount: number; elapsedSeconds: number; hintCount: number; rank: number; participants: number; playerType: "GUEST" | "USER" };
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;

export function PuzzleGame({ puzzle, puzzleId, editionDate, accountName }: { puzzle: PuzzleBoard; puzzleId?: string; editionDate?: string; accountName?: string }) {
  const storageKey = `cronews:${puzzleId ?? "sample"}`;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(puzzle.words[0]?.id ?? "");
  const [elapsed, setElapsed] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [displayName, setDisplayName] = useState(accountName ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [usedHintIds, setUsedHintIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) try {
      const data = JSON.parse(saved) as { answers?: Record<string, string>; startedAt?: number; name?: string; usedHintIds?: string[] };
      if (data.answers) setAnswers(data.answers);
      if (data.name && !accountName) setDisplayName(data.name);
      if (data.startedAt) setElapsed(Math.max(0, Math.floor((Date.now() - data.startedAt) / 1000)));
      if (data.usedHintIds) setUsedHintIds(data.usedHintIds);
    } catch { window.localStorage.removeItem(storageKey); }
    else window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: Date.now(), answers: {} }));
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [accountName, storageKey]);

  const active = puzzle.words.find((word) => word.id === selected) ?? puzzle.words[0];
  const filled = useMemo(() => puzzle.words.filter((word) => (answers[word.id] ?? "").length === word.answer.length).length, [answers, puzzle.words]);
  const updateAnswer = (value: string) => {
    const next = { ...answers, [active.id]: value.normalize("NFC").replace(/\s/g, "").toUpperCase() };
    setAnswers(next);
    window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: Date.now() - elapsed * 1000, answers: next, name: displayName, usedHintIds }));
  };
  const useHint = () => {
    if (!active.hint || usedHintIds.includes(active.id)) return;
    const next = [...usedHintIds, active.id];
    setUsedHintIds(next);
    window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: Date.now() - elapsed * 1000, answers, name: displayName, usedHintIds: next }));
  };
  const submit = async () => {
    if (!puzzleId) return setError("샘플 퍼즐은 기록을 저장할 수 없습니다.");
    if (!displayName.trim()) return setError("랭킹에 표시할 이름을 입력해 주세요.");
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/puzzles/${puzzleId}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers, displayName, elapsedSeconds: Math.max(1, elapsed), usedHintIds }) });
      if (!response.ok) throw new Error("제출에 실패했습니다.");
      setResult(await response.json() as Result); setShowSubmit(false);
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, startedAt: Date.now() - elapsed * 1000, name: displayName, usedHintIds, completed: true }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "제출에 실패했습니다."); }
    finally { setSubmitting(false); }
  };

  return <section className="game-shell">
    <header className="game-header"><div><strong>CRONEWS</strong><span>오늘의 통합 뉴스 퀴즈</span></div><div className="header-actions"><a href={accountName ? "/ranking" : "/login"}>{accountName ? `${accountName} · 랭킹` : "로그인"}</a><time>{formatTime(elapsed)}</time></div></header>
    <div className="edition"><span>{editionDate ?? "미리보기"}</span><strong>{filled}/{puzzle.words.length} 입력 완료</strong></div>
    <div className="game-layout">
      <div className="board" style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}>
        {puzzle.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => {
          if (!cell) return <span className="cell blocked" key={`${rowIndex}-${colIndex}`} />;
          const owners = puzzle.words.filter((word) => { const offset = word.direction === "ACROSS" ? colIndex - word.col : rowIndex - word.row; return offset >= 0 && offset < word.answer.length && (word.direction === "ACROSS" ? rowIndex === word.row : colIndex === word.col); });
          const word = owners.find((owner) => owner.id === selected) ?? owners[0];
          const offset = word.direction === "ACROSS" ? colIndex - word.col : rowIndex - word.row;
          return <button type="button" className={`cell ${owners.some((owner) => owner.id === selected) ? "active" : ""}`} key={`${rowIndex}-${colIndex}`} onClick={() => setSelected(word.id)}>{answers[word.id]?.[offset] ?? ""}</button>;
        }))}
      </div>
      <aside className="clue-panel"><span className="clue-number">문제 {puzzle.words.findIndex((word) => word.id === active.id) + 1} / {puzzle.words.length}</span><h2>{active.question}</h2><input aria-label="정답" value={answers[active.id] ?? ""} maxLength={active.answer.length} disabled={Boolean(result)} onChange={(event) => updateAnswer(event.target.value)} placeholder={`${active.answer.length}글자`} autoComplete="off" /><div className="hint-area">{usedHintIds.includes(active.id) ? <p><strong>힌트</strong>{active.hint}</p> : <button type="button" onClick={useHint} disabled={!active.hint || Boolean(result)}>힌트 보기 <span>사용 시 랭킹에 반영 · {usedHintIds.length}/{puzzle.words.length}</span></button>}</div><div className="clue-list">{puzzle.words.map((word, index) => <button type="button" className={word.id === active.id ? "selected" : ""} onClick={() => setSelected(word.id)} key={word.id}><span>{index + 1}</span>{word.question}{usedHintIds.includes(word.id) && <small>힌트 사용</small>}</button>)}</div><button className="submit" type="button" onClick={() => setShowSubmit(true)} disabled={Boolean(result)}>{result ? "제출 완료" : "정답 제출"}</button></aside>
    </div>
    {showSubmit && <div className="modal-backdrop"><div className="result-card" role="dialog" aria-modal="true" aria-labelledby="submit-title"><button className="close" onClick={() => setShowSubmit(false)} aria-label="닫기">×</button><span className="eyebrow">오늘의 기록</span><h2 id="submit-title">랭킹에 남길 이름을 적어주세요</h2><p>점수와 소요 시간으로 오늘의 순위가 계산됩니다.</p><label>표시 이름<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={20} disabled={Boolean(accountName)} placeholder="예: 뉴스왕" /></label>{error && <p className="error">{error}</p>}<button className="submit" onClick={submit} disabled={submitting}>{submitting ? "채점 중…" : "제출하고 순위 확인"}</button></div></div>}
    {result && <div className="modal-backdrop"><div className="result-card result celebration" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="celebration-mark" aria-hidden="true">✓</div><span className="eyebrow">오늘의 퀴즈 완료</span><h2 id="result-title">축하합니다!</h2><p className="result-summary">총 <strong>{result.totalCount}개</strong> 중 <strong>{result.correctCount}개</strong>를 맞혔습니다.</p><div className="rank-hero"><span>오늘의 전체 랭킹</span><strong>{result.rank}등</strong><small>총 {result.participants}명 참여</small></div><div className="score-grid compact"><div><span>걸린 시간</span><strong>{formatTime(result.elapsedSeconds)}</strong></div><div><span>사용한 힌트</span><strong>{result.hintCount}개</strong></div></div><p>{result.playerType === "GUEST" ? "이 브라우저의 기록은 쿠키로 기억됩니다. 로그인하면 계정 경쟁 랭킹에 참여할 수 있어요." : "로그인 계정으로 경쟁 랭킹에 기록되었습니다."}</p><button className="submit" onClick={() => setResult(null)}>완료</button></div></div>}
  </section>;
}
