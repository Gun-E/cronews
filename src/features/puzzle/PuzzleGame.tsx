"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PuzzleBoard } from "@/server/puzzle/types";
import { ProfileMenu } from "@/features/profile/ProfileMenu";
import { availablePuzzleHints, newsSearchUrl, resolveEntryPositions } from "./client-logic";

type Result = { correctCount: number; totalCount: number; elapsedSeconds: number; hintCount: number; rank: number; participants: number; playerType: "GUEST" | "USER" };
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
const formatClock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
function WordKeyboardInput({ id, value, length, disabled, onCommit }: { id: string; value: string[]; length: number; disabled: boolean; onCommit: (value: string, targets: number[]) => void }) {
  const [draft, setDraft] = useState("");
  const composing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const targets = useRef<number[]>([]);
  useEffect(() => { setDraft(""); targets.current = []; }, [id]);
  const beginEntry = (input: HTMLInputElement) => { const empty = value.map((character, index) => character ? -1 : index).filter((index) => index >= 0); targets.current = empty.length ? empty : Array.from({ length }, (_, index) => index); setDraft(""); window.requestAnimationFrame(() => input.select()); };
  const commit = (raw: string) => { const normalized = [...raw.normalize("NFC").replace(/\s/g, "").toUpperCase()].slice(0, length).join(""); setDraft(normalized); onCommit(normalized, targets.current.length ? targets.current : Array.from({ length }, (_, index) => index)); };
  const remaining = value.filter((character) => !character).length;
  return <div className="word-answer-editor">
    <div className="letter-inputs" aria-label={`${length}글자 입력 현황`}>{Array.from({ length }, (_, index) => <span className="letter-slot" key={index} aria-hidden="true">{value[index] ?? ""}</span>)}</div>
    <input ref={inputRef} id={id} className="answer-text-input" value={draft} maxLength={length} disabled={disabled} autoComplete="off" autoCapitalize="characters" inputMode="text" placeholder={remaining && remaining < length ? `교차 글자를 제외한 ${remaining}글자를 입력하세요` : `${length}글자 정답을 입력하세요`} aria-label="정답 입력" onFocus={(event) => beginEntry(event.currentTarget)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={(event) => { composing.current = false; commit(event.currentTarget.value); }} onChange={(event) => { setDraft(event.currentTarget.value); if (!composing.current) commit(event.currentTarget.value); }} />
  </div>;
}

export function PuzzleGame({ puzzle, puzzleId, editionDate, accountName, accountBio, accountAvatar, resumeSubmission = false, sequenceNumber = 1, dailyLimit = 1, completedNumbers = [] }: { puzzle: PuzzleBoard; puzzleId?: string; editionDate?: string; accountName?: string; accountBio?: string; accountAvatar?: string | null; resumeSubmission?: boolean; sequenceNumber?: number; dailyLimit?: number; completedNumbers?: number[] }) {
  const puzzleSignature = puzzle.words.map((word) => word.id).sort().join("-");
  const storageKey = `cronews:v3:${puzzleId ?? "unavailable"}:${puzzleSignature}`;
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(puzzle.words[0]?.id ?? "");
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const displayName = accountName ?? "비회원";
  const [result, setResult] = useState<Result | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [usedHintIds, setUsedHintIds] = useState<string[]>([]);

  useEffect(() => {
    setReady(true);
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const data = JSON.parse(saved) as { entries?: Record<string, string>; startedAt?: number | null; accumulatedSeconds?: number; paused?: boolean; autoPaused?: boolean; name?: string; usedHintIds?: string[] };
      if (data.entries) setEntries(data.entries);
      if (data.usedHintIds) setUsedHintIds(data.usedHintIds);
      if (data.startedAt || data.accumulatedSeconds) { const accumulated = data.accumulatedSeconds ?? 0; setStarted(true); setStartedAt(data.startedAt ?? null); setAccumulatedSeconds(accumulated); setPaused(Boolean(data.paused)); setAutoPaused(Boolean(data.autoPaused)); setElapsed(accumulated + (data.startedAt ? Math.max(0, Math.floor((Date.now() - data.startedAt) / 1000)) : 0)); }
    } catch { window.localStorage.removeItem(storageKey); }
  }, [accountName, storageKey]);

  useEffect(() => {
    if (!started || !startedAt || paused || result) return;
    const tick = () => setElapsed(accumulatedSeconds + Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [accumulatedSeconds, paused, result, started, startedAt]);

  useEffect(() => {
    if (!started || paused || result) return;
    let lastActivity = Date.now();
    const markActive = () => { lastActivity = Date.now(); };
    const pauseForInactivity = () => {
      const stoppedAt = startedAt ? accumulatedSeconds + Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : accumulatedSeconds;
      setElapsed(stoppedAt); setAccumulatedSeconds(stoppedAt); setStartedAt(null); setPaused(true); setAutoPaused(true);
      window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: null, accumulatedSeconds: stoppedAt, paused: true, autoPaused: true, entries, name: displayName, usedHintIds }));
    };
    const handleVisibility = () => { if (document.visibilityState === "hidden") pauseForInactivity(); };
    const idleCheck = window.setInterval(() => { if (Date.now() - lastActivity >= 10 * 60 * 1000) pauseForInactivity(); }, 15_000);
    window.addEventListener("pointerdown", markActive, { passive: true });
    window.addEventListener("keydown", markActive);
    window.addEventListener("touchstart", markActive, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { window.clearInterval(idleCheck); window.removeEventListener("pointerdown", markActive); window.removeEventListener("keydown", markActive); window.removeEventListener("touchstart", markActive); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [accumulatedSeconds, displayName, entries, paused, result, started, startedAt, storageKey, usedHintIds]);

  useEffect(() => { if (resumeSubmission && accountName) setShowSubmit(true); }, [accountName, resumeSubmission]);
  const active = puzzle.words.find((word) => word.id === selected) ?? puzzle.words[0];
  const cellKey = (word: typeof active, index: number) => `${word.row + (word.direction === "DOWN" ? index : 0)}:${word.col + (word.direction === "ACROSS" ? index : 0)}`;
  const answers = useMemo(() => Object.fromEntries(puzzle.words.map((word) => [word.id, [...word.answer].map((_, index) => entries[cellKey(word, index)] ?? "").join("")])), [entries, puzzle.words]);
  const activeCells = [...active.answer].map((_, index) => entries[cellKey(active, index)] ?? "");
  const filled = useMemo(() => puzzle.words.filter((word) => [...word.answer].every((_, index) => Boolean(entries[cellKey(word, index)]))).length, [entries, puzzle.words]);
  const persist = (nextEntries = entries, nextHints = usedHintIds, timer = { startedAt, accumulatedSeconds, paused }) => window.localStorage.setItem(storageKey, JSON.stringify({ ...timer, autoPaused, entries: nextEntries, name: displayName, usedHintIds: nextHints }));
  const startGame = () => { const now = Date.now(); setStarted(true); setStartedAt(now); setAccumulatedSeconds(0); setPaused(false); setAutoPaused(false); setElapsed(0); window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: now, accumulatedSeconds: 0, paused: false, autoPaused: false, entries: {}, name: displayName, usedHintIds: [] })); };
  const togglePause = () => {
    if (paused) { const now = Date.now(); setStartedAt(now); setPaused(false); setAutoPaused(false); window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: now, accumulatedSeconds, paused: false, autoPaused: false, entries, name: displayName, usedHintIds })); }
    else { setAccumulatedSeconds(elapsed); setStartedAt(null); setPaused(true); setAutoPaused(false); window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: null, accumulatedSeconds: elapsed, paused: true, autoPaused: false, entries, name: displayName, usedHintIds })); }
  };
  const updateActiveAnswer = (raw: string, targets: number[]) => {
    const characters = [...raw.normalize("NFC").replace(/\s/g, "").toUpperCase()].slice(0, active.answer.length);
    const next = { ...entries };
    const positions = resolveEntryPositions(characters.length, active.answer.length, targets);
    positions.forEach((target, index) => { const character = characters[index]; if (character) next[cellKey(active, target)] = character; else delete next[cellKey(active, target)]; });
    setEntries(next); persist(next);
  };
  const activeHints = availablePuzzleHints(active);
  const revealedHints = activeHints.filter(({ id }) => usedHintIds.includes(id));
  const nextHint = activeHints.find(({ id }) => !usedHintIds.includes(id));
  const useHint = () => {
    if (!started || paused || !nextHint || result) return;
    const next = [...usedHintIds, nextHint.id];
    setUsedHintIds(next); persist(entries, next);
  };
  const submit = async () => {
    if (!puzzleId) return setError("퍼즐 기록을 저장할 수 없습니다.");
    if (!displayName.trim()) return setError("랭킹에 표시할 이름을 입력해 주세요.");
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/puzzles/${puzzleId}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers, displayName, elapsedSeconds: Math.max(1, elapsed), usedHintIds }) });
      if (!response.ok) throw new Error("제출에 실패했습니다.");
      const score = await response.json() as Result;
      setResult(score);
      setElapsed(score.elapsedSeconds);
      setResultOpen(true);
      setShowSubmit(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "제출에 실패했습니다."); } finally { setSubmitting(false); }
  };
  const sources = Array.from(new Map(puzzle.words.flatMap((word) => word.sources ?? []).map((source) => [source.url, source])).values());

  return <section className="game-shell">
    <header className="game-header"><div className="header-brand"><a className="cronews-logo" href="/" aria-label="CRONEWS 홈"><img src="/images/logo.svg" alt="CRONEWS" /></a><span>오늘의 통합 뉴스 퀴즈</span></div><div className="header-actions"><a href="/ranking">랭킹</a>{accountName ? <ProfileMenu nickname={accountName} bio={accountBio} avatarUrl={accountAvatar} /> : <a className="login-primary" href="/login">간편 로그인</a>}</div></header>
    {!started ? <section className="start-gate"><span className="eyebrow">{editionDate} · 퍼즐 {sequenceNumber}</span><h1>오늘의 뉴스 퀴즈</h1><p>시작하면 타이머가 켜집니다. 시간 제한은 없어요.</p><button type="button" className="submit" onClick={startGame} disabled={!ready}>게임 시작</button></section> : <>
      <div className="timer-panel elapsed">
        <div className="timer-edition">
          <strong>퍼즐 {sequenceNumber}</strong>
          <span>{editionDate} · {filled}/{puzzle.words.length} 입력</span>
        </div>
        <div className="timer-controls">
          <div className="timer-reading">
            <span>{paused ? "일시정지 중" : result ? "풀이 완료" : "진행 시간"}</span>
            <time dateTime={`PT${elapsed}S`}>{formatClock(elapsed)}</time>
          </div>
          <button type="button" className={`pause-button ${paused ? "is-paused" : ""}`} onClick={togglePause} disabled={Boolean(result) || submitting} aria-label={paused ? "게임 계속하기" : "게임 일시정지"} title={paused ? "게임 계속하기" : "게임 일시정지"}>
            <span className="timer-action-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
      {accountName && <nav className="puzzle-picker" aria-label="오늘의 퍼즐 선택"><div><strong>오늘의 도전</strong><span>{completedNumbers.length}/{dailyLimit}개 완료</span></div><div className="puzzle-numbers">{Array.from({ length: dailyLimit }, (_, index) => index + 1).map((number) => <a key={number} href={`/?puzzle=${number}`} aria-current={number === sequenceNumber ? "page" : undefined} aria-label={`퍼즐 ${number}${completedNumbers.includes(number) ? ", 완료" : ""}`} className={`${number === sequenceNumber ? "current" : ""} ${completedNumbers.includes(number) ? "completed" : ""}`}><span>{number}</span>{completedNumbers.includes(number) && <span className="puzzle-complete-mark" aria-hidden="true">✓</span>}</a>)}</div></nav>}
      <div className={`game-layout ${paused ? "is-paused" : ""} ${autoPaused ? "auto-paused" : ""}`}><div inert={paused} className="board" style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}>{puzzle.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => { if (!cell) return <span className="cell blocked" key={`${rowIndex}-${colIndex}`} />; const owners = puzzle.words.filter((word) => { const offset = word.direction === "ACROSS" ? colIndex - word.col : rowIndex - word.row; return offset >= 0 && offset < word.answer.length && (word.direction === "ACROSS" ? rowIndex === word.row : colIndex === word.col); }); const selectedOwnerIndex = owners.findIndex((owner) => owner.id === selected); const word = owners.length > 1 && selectedOwnerIndex >= 0 ? owners[(selectedOwnerIndex + 1) % owners.length] : owners[0]; return <button type="button" className={`cell ${owners.some((owner) => owner.id === selected) ? "active" : ""}`} key={`${rowIndex}-${colIndex}`} disabled={!word} aria-label={owners.map((owner) => `문제 ${puzzle.words.indexOf(owner) + 1}`).join(", ")} onClick={() => word && setSelected(word.id)}>{entries[`${rowIndex}:${colIndex}`] ?? ""}</button>; }))}</div>
        <aside className="clue-panel"><span className="clue-number">문제 {puzzle.words.findIndex((word) => word.id === active.id) + 1} / {puzzle.words.length}</span><h2>{active.question}</h2><WordKeyboardInput id={`answer-${active.id}`} value={activeCells} length={active.answer.length} disabled={Boolean(result) || paused} onCommit={updateActiveAnswer} />
          <div className="hint-area progressive"><div className="hint-heading"><strong>단계별 힌트</strong><span>{revealedHints.length}/{activeHints.length} · 랭킹 반영</span></div>{revealedHints.map(({ id, level, text }) => <p key={id}><strong>{level}단계</strong>{level === 4 ? (active.sources?.length ? active.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher ?? "뉴스 원문"} 기사 전체 보기 ↗</a>) : <a href={newsSearchUrl(active)} target="_blank" rel="noopener noreferrer">관련 뉴스 검색 ↗</a>) : <span>{text}{level === 1 && active.dictionaryHint && <><br /><small>출처 국립국어원 한국어기초사전 · <a href="https://creativecommons.org/licenses/by-sa/2.0/kr/" target="_blank" rel="noopener noreferrer">CC BY-SA 2.0 KR</a></small></>}</span>}</p>)}<button type="button" onClick={useHint} disabled={paused || !nextHint || Boolean(result)}>{nextHint ? `${nextHint.level}단계 힌트 보기` : "힌트 모두 확인"}</button></div>
          <div className="clue-list">{puzzle.words.map((word, index) => { const count = availablePuzzleHints(word).filter(({ id }) => usedHintIds.includes(id)).length; return <button type="button" className={word.id === active.id ? "selected" : ""} onClick={() => setSelected(word.id)} key={word.id}><span>{index + 1}</span>{word.question}{count > 0 && <small>힌트 {count}단계</small>}</button>; })}</div><button className="submit" type="button" onClick={() => result ? setResultOpen(true) : accountName ? setShowSubmit(true) : void submit()} disabled={submitting || paused}>{result ? "결과 다시 보기" : submitting ? "채점 중…" : "정답 제출"}</button>{error && <p className="error">{error}</p>}</aside></div>
    </>}
    {showSubmit && accountName && <div className="modal-backdrop"><div className="result-card submit-choice" role="dialog" aria-modal="true"><button className="close" onClick={() => setShowSubmit(false)}>×</button><h2>정답 제출</h2><div className="signed-player"><strong>{accountName}</strong></div><button className="submit" onClick={submit} disabled={submitting}>제출하기</button>{error && <p className="error">{error}</p>}</div></div>}
    {result && resultOpen && <div className="modal-backdrop"><div className="result-card result celebration" role="dialog" aria-modal="true"><h2>퀴즈 결과</h2><p className="result-summary">총 <strong>{result.totalCount}개</strong> 중 <strong>{result.correctCount}개</strong>를 맞혔습니다.</p><div className="rank-hero"><span>오늘의 랭킹</span><strong>{result.rank}등</strong><small>총 {result.participants}명 참여</small></div><div className="score-grid compact"><div><span>걸린 시간</span><strong>{formatTime(result.elapsedSeconds)}</strong></div><div><span>사용한 힌트</span><strong>{result.hintCount}단계</strong></div></div>{sources.length > 0 && <div className="news-sources"><strong>이 문제를 만든 뉴스</strong>{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"><span>{source.publisher ?? "원문 기사"}</span>{source.title}</a>)}</div>}<div className="result-actions">{result.playerType === "USER" && sequenceNumber < dailyLimit && <button className="next-puzzle" onClick={() => { window.location.href = `/?puzzle=${sequenceNumber + 1}`; }}>다음 퍼즐 풀기</button>}<button className="submit" onClick={() => setResultOpen(false)}>결과 닫기</button></div></div></div>}
  </section>;
}
