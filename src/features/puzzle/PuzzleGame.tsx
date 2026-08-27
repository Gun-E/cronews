"use client";

import { useEffect, useMemo, useState } from "react";
import type { PuzzleBoard } from "@/server/puzzle/types";

type Result = { correctCount: number; totalCount: number; elapsedSeconds: number; rank: number; participants: number; playerType: "GUEST" | "USER" };
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

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) try {
      const data = JSON.parse(saved) as { answers?: Record<string, string>; startedAt?: number; name?: string };
      if (data.answers) setAnswers(data.answers);
      if (data.name && !accountName) setDisplayName(data.name);
      if (data.startedAt) setElapsed(Math.max(0, Math.floor((Date.now() - data.startedAt) / 1000)));
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
    window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: Date.now() - elapsed * 1000, answers: next, name: displayName }));
  };
  const submit = async () => {
    if (!puzzleId) return setError("샘플 퍼즐은 기록을 저장할 수 없습니다.");
    if (!displayName.trim()) return setError("랭킹에 표시할 이름을 입력해 주세요.");
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/puzzles/${puzzleId}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers, displayName, elapsedSeconds: Math.max(1, elapsed) }) });
      if (!response.ok) throw new Error("제출에 실패했습니다.");
      setResult(await response.json() as Result); setShowSubmit(false);
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, startedAt: Date.now() - elapsed * 1000, name: displayName, completed: true }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "제출에 실패했습니다."); }
    finally { setSubmitting(false); }
  };

  return <section className="game-shell">
    <header className="game-header"><div><strong>CRONEWS</strong><span>오늘의 통합 뉴스 퀴즈</span></div><div className="header-actions"><a href={accountName ? "/ranking" : "/login"}>{accountName ? `${accountName} · 랭킹` : "로그인"}</a><time>{formatTime(elapsed)}</time></div></header>
    <div className="edition"><span>{editionDate ?? "미리보기"}</span><strong>{filled}/{puzzle.words.length} 입력 완료</strong></div>
    <div className="game-layout">
      <div className="board" style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${puzzle.height}, minmax(0, 1fr))` }}>
        {puzzle.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => {
          if (!cell) return <span className="cell blocked" key={`${rowIndex}-${colIndex}`} />;
          const owners = puzzle.words.filter((word) => { const offset = word.direction === "ACROSS" ? colIndex - word.col : rowIndex - word.row; return offset >= 0 && offset < word.answer.length && (word.direction === "ACROSS" ? rowIndex === word.row : colIndex === word.col); });
          const word = owners.find((owner) => owner.id === selected) ?? owners[0];
          const offset = word.direction === "ACROSS" ? colIndex - word.col : rowIndex - word.row;
          return <button type="button" className={`cell ${owners.some((owner) => owner.id === selected) ? "active" : ""}`} key={`${rowIndex}-${colIndex}`} onClick={() => setSelected(word.id)}>{answers[word.id]?.[offset] ?? ""}</button>;
        }))}
      </div>
      <aside className="clue-panel"><span className="clue-number">문제 {puzzle.words.findIndex((word) => word.id === active.id) + 1} / {puzzle.words.length}</span><h2>{active.question}</h2><input aria-label="정답" value={answers[active.id] ?? ""} maxLength={active.answer.length} disabled={Boolean(result)} onChange={(event) => updateAnswer(event.target.value)} placeholder={`${active.answer.length}글자`} autoComplete="off" /><div className="clue-list">{puzzle.words.map((word, index) => <button type="button" className={word.id === active.id ? "selected" : ""} onClick={() => setSelected(word.id)} key={word.id}><span>{index + 1}</span>{word.question}</button>)}</div><button className="submit" type="button" onClick={() => setShowSubmit(true)} disabled={Boolean(result)}>{result ? "제출 완료" : "정답 제출"}</button></aside>
    </div>
    {showSubmit && <div className="modal-backdrop"><div className="result-card" role="dialog" aria-modal="true" aria-labelledby="submit-title"><button className="close" onClick={() => setShowSubmit(false)} aria-label="닫기">×</button><span className="eyebrow">오늘의 기록</span><h2 id="submit-title">랭킹에 남길 이름을 적어주세요</h2><p>점수와 소요 시간으로 오늘의 순위가 계산됩니다.</p><label>표시 이름<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={20} disabled={Boolean(accountName)} placeholder="예: 뉴스왕" /></label>{error && <p className="error">{error}</p>}<button className="submit" onClick={submit} disabled={submitting}>{submitting ? "채점 중…" : "제출하고 순위 확인"}</button></div></div>}
    {result && <div className="modal-backdrop"><div className="result-card result"><span className="eyebrow">완주 기록</span><h2>{result.correctCount}/{result.totalCount} 정답</h2><div className="score-grid"><div><span>걸린 시간</span><strong>{formatTime(result.elapsedSeconds)}</strong></div><div><span>오늘의 순위</span><strong>{result.rank}등 <small>/ {result.participants}명</small></strong></div></div><p>{result.playerType === "GUEST" ? "이 브라우저의 기록은 쿠키로 기억됩니다. 로그인하면 계정 경쟁 랭킹에 참여할 수 있어요." : "로그인 계정으로 경쟁 랭킹에 기록되었습니다."}</p><button className="submit" onClick={() => setResult(null)}>퍼즐 다시 보기</button></div></div>}
  </section>;
}
