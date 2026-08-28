"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PuzzleBoard } from "@/server/puzzle/types";
import { buildProgressiveHints } from "./client-logic";

type Result = { correctCount: number; totalCount: number; elapsedSeconds: number; hintCount: number; rank: number; participants: number; playerType: "GUEST" | "USER" };
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
const formatClock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const QUIZ_SECONDS = 15 * 60;

function WordKeyboardInput({ id, value, length, disabled, onCommit }: { id: string; value: string; length: number; disabled: boolean; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const composing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!composing.current) setDraft(value); }, [value]);
  const commit = (raw: string) => { const next = [...raw.normalize("NFC").replace(/\s/g, "").toUpperCase()].slice(0, length).join(""); setDraft(next); onCommit(next); };
  return <div className="letter-inputs" aria-label={`${length}글자 정답 입력`} onClick={() => inputRef.current?.focus()}>
    <input ref={inputRef} id={id} className="keyboard-capture" value={draft} disabled={disabled} autoComplete="off" autoCapitalize="characters" inputMode="text" aria-label="정답 키보드 입력"
    onCompositionStart={() => { composing.current = true; }}
    onCompositionEnd={(event) => { composing.current = false; commit(event.currentTarget.value); }}
    onChange={(event) => { setDraft(event.target.value); if (!composing.current) commit(event.target.value); }} />
    {Array.from({ length }, (_, index) => <input className="letter-slot" key={index} value={[...value][index] ?? ""} readOnly tabIndex={-1} aria-label={`${index + 1}번째 글자`} />)}
  </div>;
}

export function PuzzleGame({ puzzle, puzzleId, editionDate, accountName, resumeSubmission = false, sequenceNumber = 1, dailyLimit = 1, completedNumbers = [] }: { puzzle: PuzzleBoard; puzzleId?: string; editionDate?: string; accountName?: string; resumeSubmission?: boolean; sequenceNumber?: number; dailyLimit?: number; completedNumbers?: number[] }) {
  const puzzleSignature = puzzle.words.map((word) => word.id).sort().join("-");
  const storageKey = `cronews:v3:${puzzleId ?? "unavailable"}:${puzzleSignature}`;
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(puzzle.words[0]?.id ?? "");
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const displayName = accountName ?? "비회원";
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [usedHintIds, setUsedHintIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const data = JSON.parse(saved) as { entries?: Record<string, string>; startedAt?: number; name?: string; usedHintIds?: string[] };
      if (data.entries) setEntries(data.entries);
      if (data.usedHintIds) setUsedHintIds(data.usedHintIds);
      if (data.startedAt) { setStarted(true); setStartedAt(data.startedAt); setElapsed(Math.min(QUIZ_SECONDS, Math.max(0, Math.floor((Date.now() - data.startedAt) / 1000)))); }
    } catch { window.localStorage.removeItem(storageKey); }
  }, [accountName, storageKey]);

  useEffect(() => {
    if (!started || !startedAt || result) return;
    const tick = () => setElapsed(Math.min(QUIZ_SECONDS, Math.max(0, Math.floor((Date.now() - startedAt) / 1000))));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [result, started, startedAt]);

  useEffect(() => { if (resumeSubmission && accountName) setShowSubmit(true); }, [accountName, resumeSubmission]);

  const active = puzzle.words.find((word) => word.id === selected) ?? puzzle.words[0];
  const remaining = Math.max(0, QUIZ_SECONDS - elapsed);
  const timerState = remaining <= 60 ? "danger" : remaining <= 300 ? "warning" : "normal";
  const cellKey = (word: typeof active, index: number) => `${word.row + (word.direction === "DOWN" ? index : 0)}:${word.col + (word.direction === "ACROSS" ? index : 0)}`;
  const answers = useMemo(() => Object.fromEntries(puzzle.words.map((word) => [word.id, [...word.answer].map((_, index) => entries[cellKey(word, index)] ?? "").join("")])), [entries, puzzle.words]);
  const filled = useMemo(() => puzzle.words.filter((word) => [...word.answer].every((_, index) => Boolean(entries[cellKey(word, index)]))).length, [entries, puzzle.words]);
  const persist = (nextEntries = entries, nextHints = usedHintIds) => window.localStorage.setItem(storageKey, JSON.stringify({ startedAt, entries: nextEntries, name: displayName, usedHintIds: nextHints }));
  const startGame = () => { const now = Date.now(); setStarted(true); setStartedAt(now); setElapsed(0); window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: now, entries: {}, name: displayName, usedHintIds: [] })); };
  const updateActiveAnswer = (value: string) => {
    const characters = [...value.normalize("NFC").replace(/\s/g, "").toUpperCase()];
    const next = { ...entries };
    [...active.answer].forEach((_, index) => { delete next[cellKey(active, index)]; });
    characters.slice(0, active.answer.length).forEach((character, index) => { next[cellKey(active, index)] = character; });
    setEntries(next); persist(next);
  };
  const activeHints = buildProgressiveHints(active.answer, active.hints, active.hint);
  const revealedHints = activeHints.filter((_, index) => usedHintIds.includes(`${active.id}:${index + 1}`));
  const useHint = () => {
    const level = revealedHints.length + 1;
    if (!started || level > activeHints.length || result) return;
    const next = [...usedHintIds, `${active.id}:${level}`];
    setUsedHintIds(next); persist(entries, next);
  };
  const submit = async () => {
    if (!puzzleId) return setError("퍼즐 기록을 저장할 수 없습니다.");
    if (!displayName.trim()) return setError("랭킹에 표시할 이름을 입력해 주세요.");
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/puzzles/${puzzleId}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers, displayName, elapsedSeconds: Math.max(1, elapsed), usedHintIds }) });
      if (!response.ok) throw new Error("제출에 실패했습니다.");
      setResult(await response.json() as Result); setShowSubmit(false); persist();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "제출에 실패했습니다."); } finally { setSubmitting(false); }
  };
  const sources = Array.from(new Map(puzzle.words.flatMap((word) => word.sources ?? []).map((source) => [source.url, source])).values());

  return <section className="game-shell">
    <header className="game-header"><div><a className="cronews-logo" href="/" aria-label="CRONEWS 홈"><img src="/images/logo.svg" alt="CRONEWS" /></a><span>오늘의 통합 뉴스 퀴즈</span></div><div className="header-actions"><a href={accountName ? "/ranking" : "/login"}>{accountName ? `${accountName} · 랭킹` : "로그인"}</a>{accountName && <form action="/auth/logout" method="post"><button type="submit">로그아웃</button></form>}</div></header>
    {!started ? <section className="start-gate"><span className="eyebrow">{editionDate} · 퍼즐 {sequenceNumber}</span><div className="start-lock" aria-hidden="true">?</div><h1>문제는 시작 후 공개됩니다</h1><p>제한 시간은 15분입니다. 시작 버튼을 누르는 순간부터 타이머가 흐르며, 문항별로 어려운 순서의 힌트를 최대 5단계까지 사용할 수 있습니다.</p><button type="button" className="submit" onClick={startGame}>게임 시작</button></section> : <>
      <div className={`timer-panel ${timerState}`}><div className="timer-copy"><div><span className="timer-icon" aria-hidden="true">◷</span><span>{remaining ? "남은 시간" : "시간 종료"}</span></div><time dateTime={`PT${remaining}S`}>{formatClock(remaining)}</time></div><div className="timer-track" role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={QUIZ_SECONDS} aria-valuenow={remaining}><span style={{ width: `${(remaining / QUIZ_SECONDS) * 100}%` }} /></div><div className="timer-meta"><span>{editionDate} · 퍼즐 {sequenceNumber}</span><strong>{filled}/{puzzle.words.length} 문제 입력 완료</strong></div></div>
      {accountName && <nav className="puzzle-picker" aria-label="오늘의 퍼즐 선택"><div><strong>오늘의 도전</strong><span>{completedNumbers.length}/{dailyLimit}개 완료</span></div><div className="puzzle-numbers">{Array.from({ length: dailyLimit }, (_, index) => index + 1).map((number) => <a key={number} href={`/?puzzle=${number}`} className={`${number === sequenceNumber ? "current" : ""} ${completedNumbers.includes(number) ? "completed" : ""}`}>{completedNumbers.includes(number) ? "✓" : number}</a>)}</div></nav>}
      <div className="game-layout"><div className="board" style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}>{puzzle.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => { if (!cell) return <span className="cell blocked" key={`${rowIndex}-${colIndex}`} />; const owners = puzzle.words.filter((word) => { const offset = word.direction === "ACROSS" ? colIndex - word.col : rowIndex - word.row; return offset >= 0 && offset < word.answer.length && (word.direction === "ACROSS" ? rowIndex === word.row : colIndex === word.col); }); const word = owners.find((owner) => owner.id === selected) ?? owners[0]; return <button type="button" className={`cell ${owners.some((owner) => owner.id === selected) ? "active" : ""}`} key={`${rowIndex}-${colIndex}`} onClick={() => setSelected(word.id)}>{entries[`${rowIndex}:${colIndex}`] ?? ""}</button>; }))}</div>
        <aside className="clue-panel"><span className="clue-number">문제 {puzzle.words.findIndex((word) => word.id === active.id) + 1} / {puzzle.words.length}</span><h2>{active.question}</h2><WordKeyboardInput id={`answer-${active.id}`} value={answers[active.id] ?? ""} length={active.answer.length} disabled={Boolean(result) || !remaining} onCommit={updateActiveAnswer} />
          <div className="hint-area progressive"><div className="hint-heading"><strong>단계별 힌트</strong><span>{revealedHints.length}/5 · 단계마다 랭킹 반영</span></div>{revealedHints.map((hint, index) => <p key={index}><strong>{index + 1}단계</strong>{hint}</p>)}<button type="button" onClick={useHint} disabled={!activeHints.length || revealedHints.length >= activeHints.length || Boolean(result)}>{revealedHints.length ? `${revealedHints.length + 1}단계 힌트 보기` : "1단계 힌트 보기"}</button></div>
          <div className="clue-list">{puzzle.words.map((word, index) => { const count = usedHintIds.filter((id) => id.startsWith(`${word.id}:`)).length; return <button type="button" className={word.id === active.id ? "selected" : ""} onClick={() => setSelected(word.id)} key={word.id}><span>{index + 1}</span>{word.question}{count > 0 && <small>힌트 {count}단계</small>}</button>; })}</div><button className="submit" type="button" onClick={() => accountName ? setShowSubmit(true) : void submit()} disabled={Boolean(result) || submitting}>{result ? "제출 완료" : submitting ? "채점 중…" : "정답 제출"}</button>{error && <p className="error">{error}</p>}</aside></div>
    </>}
    {showSubmit && accountName && <div className="modal-backdrop"><div className="result-card submit-choice" role="dialog" aria-modal="true"><button className="close" onClick={() => setShowSubmit(false)}>×</button><span className="eyebrow">정답 제출</span><h2>로그인 계정으로 기록할까요?</h2><div className="signed-player"><span>로그인 계정</span><strong>{accountName}</strong></div><button className="submit" onClick={submit} disabled={submitting}>{accountName}(으)로 제출</button>{error && <p className="error">{error}</p>}</div></div>}
    {result && <div className="modal-backdrop"><div className="result-card result celebration" role="dialog" aria-modal="true"><div className="celebration-mark">✓</div><span className="eyebrow">오늘의 퀴즈 완료</span><h2>축하합니다!</h2><p className="result-summary">총 <strong>{result.totalCount}개</strong> 중 <strong>{result.correctCount}개</strong>를 맞혔습니다.</p><div className="rank-hero"><span>오늘의 랭킹</span><strong>{result.rank}등</strong><small>총 {result.participants}명 참여</small></div><div className="score-grid compact"><div><span>걸린 시간</span><strong>{formatTime(result.elapsedSeconds)}</strong></div><div><span>사용한 힌트</span><strong>{result.hintCount}단계</strong></div></div>{sources.length > 0 && <div className="news-sources"><strong>이 문제를 만든 뉴스</strong>{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"><span>{source.publisher ?? "원문 기사"}</span>{source.title}</a>)}</div>}<div className="result-actions">{result.playerType === "USER" && sequenceNumber < dailyLimit && <button className="next-puzzle" onClick={() => { window.location.href = `/?puzzle=${sequenceNumber + 1}`; }}>다음 퍼즐 풀기</button>}<button className="submit" onClick={() => setResult(null)}>결과 닫기</button></div></div></div>}
  </section>;
}
