"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PuzzleBoard } from "@/server/puzzle/types";

type Result = { correctCount: number; totalCount: number; elapsedSeconds: number; hintCount: number; rank: number; participants: number; playerType: "GUEST" | "USER" };
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
const formatClock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const QUIZ_SECONDS = 15 * 60;

function LetterInput({ id, index, value, disabled, onCommit, onPasteText, onEmptyBackspace }: { id: string; index: number; value: string; disabled: boolean; onCommit: (value: string, moveFocus?: boolean) => void; onPasteText: (value: string) => void; onEmptyBackspace: () => void }) {
  const [draft, setDraft] = useState(value);
  const composing = useRef(false);
  useEffect(() => { if (!composing.current) setDraft(value); }, [value]);
  return <input id={id} aria-label={`${index + 1}번째 글자`} value={draft} maxLength={1} disabled={disabled} autoComplete="off" inputMode="text"
    onCompositionStart={() => { composing.current = true; }}
    onCompositionEnd={(event) => { composing.current = false; const next = event.currentTarget.value.normalize("NFC"); setDraft(next); onCommit(next, true); }}
    onChange={(event) => { const next = event.target.value; setDraft(next); if (!composing.current) onCommit(next, true); }}
    onPaste={(event) => { const pasted = event.clipboardData.getData("text"); if ([...pasted].length > 1) { event.preventDefault(); onPasteText(pasted); } }}
    onKeyDown={(event) => { if (event.key === "Backspace" && !draft) onEmptyBackspace(); }} />;
}

export function PuzzleGame({ puzzle, puzzleId, editionDate, accountName, resumeSubmission = false }: { puzzle: PuzzleBoard; puzzleId?: string; editionDate?: string; accountName?: string; resumeSubmission?: boolean }) {
  const storageKey = `cronews:${puzzleId ?? "sample"}`;
  const [entries, setEntries] = useState<Record<string, string>>({});
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
      const data = JSON.parse(saved) as { entries?: Record<string, string>; answers?: Record<string, string>; startedAt?: number; name?: string; usedHintIds?: string[] };
      if (data.entries) setEntries(data.entries);
      else if (data.answers) {
        const restored: Record<string, string> = {};
        puzzle.words.forEach((word) => [...(data.answers?.[word.id] ?? "")].forEach((character, index) => { const row = word.row + (word.direction === "DOWN" ? index : 0); const col = word.col + (word.direction === "ACROSS" ? index : 0); if (character) restored[`${row}:${col}`] = character; }));
        setEntries(restored);
      }
      if (data.name && !accountName) setDisplayName(data.name);
      if (data.startedAt) setElapsed(Math.min(QUIZ_SECONDS, Math.max(0, Math.floor((Date.now() - data.startedAt) / 1000))));
      if (data.usedHintIds) setUsedHintIds(data.usedHintIds);
    } catch { window.localStorage.removeItem(storageKey); }
    else window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: Date.now(), answers: {} }));
    const timer = window.setInterval(() => setElapsed((value) => Math.min(QUIZ_SECONDS, value + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [accountName, puzzle.words, storageKey]);

  useEffect(() => {
    if (resumeSubmission && accountName) setShowSubmit(true);
  }, [accountName, resumeSubmission]);

  const active = puzzle.words.find((word) => word.id === selected) ?? puzzle.words[0];
  const remaining = Math.max(0, QUIZ_SECONDS - elapsed);
  const timerState = remaining <= 60 ? "danger" : remaining <= 300 ? "warning" : "normal";
  const cellKey = (word: typeof active, index: number) => `${word.row + (word.direction === "DOWN" ? index : 0)}:${word.col + (word.direction === "ACROSS" ? index : 0)}`;
  const answers = useMemo(() => Object.fromEntries(puzzle.words.map((word) => [word.id, [...word.answer].map((_, index) => entries[cellKey(word, index)] ?? "").join("")])), [entries, puzzle.words]);
  const filled = useMemo(() => puzzle.words.filter((word) => [...word.answer].every((_, index) => Boolean(entries[cellKey(word, index)]))).length, [entries, puzzle.words]);
  const updateCharacters = (index: number, value: string, moveFocus = true) => {
    const characters = [...value.normalize("NFC").replace(/\s/g, "").toUpperCase()];
    const next = { ...entries };
    if (!characters.length) delete next[cellKey(active, index)];
    else characters.slice(0, active.answer.length - index).forEach((character, offset) => { next[cellKey(active, index + offset)] = character; });
    setEntries(next);
    window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: Date.now() - elapsed * 1000, entries: next, name: displayName, usedHintIds }));
    const nextIndex = Math.min(index + Math.max(characters.length, 1), active.answer.length - 1);
    if (moveFocus && characters.length && index < active.answer.length - 1) window.setTimeout(() => document.getElementById(`answer-${active.id}-${nextIndex}`)?.focus(), 0);
  };
  const useHint = () => {
    if (!active.hint || usedHintIds.includes(active.id)) return;
    const next = [...usedHintIds, active.id];
    setUsedHintIds(next);
    window.localStorage.setItem(storageKey, JSON.stringify({ startedAt: Date.now() - elapsed * 1000, entries, name: displayName, usedHintIds: next }));
  };
  const submit = async () => {
    if (!puzzleId) return setError("샘플 퍼즐은 기록을 저장할 수 없습니다.");
    if (!displayName.trim()) return setError("랭킹에 표시할 이름을 입력해 주세요.");
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/puzzles/${puzzleId}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers, displayName, elapsedSeconds: Math.max(1, elapsed), usedHintIds }) });
      if (!response.ok) throw new Error("제출에 실패했습니다.");
      setResult(await response.json() as Result); setShowSubmit(false);
      window.localStorage.setItem(storageKey, JSON.stringify({ entries, startedAt: Date.now() - elapsed * 1000, name: displayName, usedHintIds, completed: true }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "제출에 실패했습니다."); }
    finally { setSubmitting(false); }
  };
  const continueWithLogin = () => {
    window.localStorage.setItem(storageKey, JSON.stringify({ entries, startedAt: Date.now() - elapsed * 1000, name: displayName, usedHintIds, pendingSubmission: true }));
    window.location.href = "/login?next=%2F%3Fsubmit%3Dpending";
  };

  return <section className="game-shell">
    <header className="game-header"><div><a className="cronews-logo" href="/" aria-label="CRONEWS 홈"><img src="/images/logo.svg" alt="CRONEWS" /></a><span>오늘의 통합 뉴스 퀴즈</span></div><div className="header-actions"><a href={accountName ? "/ranking" : "/login"}>{accountName ? `${accountName} · 랭킹` : "로그인"}</a></div></header>
    <div className={`timer-panel ${timerState}`}><div className="timer-copy"><div><span className="timer-icon" aria-hidden="true">◷</span><span>{remaining ? "남은 시간" : "시간 종료"}</span></div><time dateTime={`PT${remaining}S`}>{formatClock(remaining)}</time></div><div className="timer-track" role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={QUIZ_SECONDS} aria-valuenow={remaining}><span style={{ width: `${(remaining / QUIZ_SECONDS) * 100}%` }} /></div><div className="timer-meta"><span>{editionDate ?? "오늘"}</span><strong>{filled}/{puzzle.words.length} 문제 입력 완료</strong></div></div>
    <div className="game-layout">
      <div className="board" style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}>
        {puzzle.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => {
          if (!cell) return <span className="cell blocked" key={`${rowIndex}-${colIndex}`} />;
          const owners = puzzle.words.filter((word) => { const offset = word.direction === "ACROSS" ? colIndex - word.col : rowIndex - word.row; return offset >= 0 && offset < word.answer.length && (word.direction === "ACROSS" ? rowIndex === word.row : colIndex === word.col); });
          const word = owners.find((owner) => owner.id === selected) ?? owners[0];
          return <button type="button" className={`cell ${owners.some((owner) => owner.id === selected) ? "active" : ""}`} key={`${rowIndex}-${colIndex}`} onClick={() => setSelected(word.id)}>{entries[`${rowIndex}:${colIndex}`] ?? ""}</button>;
        }))}
      </div>
      <aside className="clue-panel"><span className="clue-number">문제 {puzzle.words.findIndex((word) => word.id === active.id) + 1} / {puzzle.words.length}</span><h2>{active.question}</h2><div className="letter-inputs" aria-label={`${active.answer.length}글자 정답 입력`}>{[...active.answer].map((_, index) => <LetterInput id={`answer-${active.id}-${index}`} key={`${active.id}-${index}`} index={index} value={entries[cellKey(active, index)] ?? ""} disabled={Boolean(result)} onCommit={(value, moveFocus) => updateCharacters(index, value, moveFocus)} onPasteText={(value) => updateCharacters(index, value, true)} onEmptyBackspace={() => { if (index > 0) document.getElementById(`answer-${active.id}-${index - 1}`)?.focus(); }} />)}</div><div className="hint-area">{usedHintIds.includes(active.id) ? <p><strong>힌트</strong>{active.hint}</p> : <button type="button" onClick={useHint} disabled={!active.hint || Boolean(result)}>힌트 보기 <span>사용 시 랭킹에 반영 · {usedHintIds.length}/{puzzle.words.length}</span></button>}</div><div className="clue-list">{puzzle.words.map((word, index) => <button type="button" className={word.id === active.id ? "selected" : ""} onClick={() => setSelected(word.id)} key={word.id}><span>{index + 1}</span>{word.question}{usedHintIds.includes(word.id) && <small>힌트 사용</small>}</button>)}</div><button className="submit" type="button" onClick={() => setShowSubmit(true)} disabled={Boolean(result)}>{result ? "제출 완료" : "정답 제출"}</button></aside>
    </div>
    {showSubmit && <div className="modal-backdrop"><div className="result-card submit-choice" role="dialog" aria-modal="true" aria-labelledby="submit-title"><button className="close" onClick={() => setShowSubmit(false)} aria-label="닫기">×</button><span className="eyebrow">정답 제출</span><h2 id="submit-title">기록을 어떻게 남길까요?</h2><p>답안과 소요 시간은 그대로 유지됩니다. 로그인하면 계정 경쟁 랭킹에 기록됩니다.</p>{accountName ? <div className="signed-player"><span>로그인 계정</span><strong>{accountName}</strong></div> : <><label>비회원 닉네임<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={20} placeholder="예: 뉴스왕" /></label><button className="submit" onClick={submit} disabled={submitting}>{submitting ? "채점 중…" : "닉네임으로 제출"}</button><div className="choice-divider"><span>또는</span></div><button className="login-submit" type="button" onClick={continueWithLogin}>로그인하고 경쟁 랭킹에 제출</button></>}{accountName && <button className="submit" onClick={submit} disabled={submitting}>{submitting ? "채점 중…" : `${accountName}(으)로 제출`}</button>}{error && <p className="error">{error}</p>}</div></div>}
    {result && <div className="modal-backdrop"><div className="result-card result celebration" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="celebration-mark" aria-hidden="true">✓</div><span className="eyebrow">오늘의 퀴즈 완료</span><h2 id="result-title">축하합니다!</h2><p className="result-summary">총 <strong>{result.totalCount}개</strong> 중 <strong>{result.correctCount}개</strong>를 맞혔습니다.</p><div className="rank-hero"><span>{result.playerType === "USER" ? "오늘의 경쟁 랭킹" : "비회원 플레이 순위"}</span><strong>{result.rank}등</strong><small>총 {result.participants}명 참여</small></div><div className="score-grid compact"><div><span>걸린 시간</span><strong>{formatTime(result.elapsedSeconds)}</strong></div><div><span>사용한 힌트</span><strong>{result.hintCount}개</strong></div></div><p>{result.playerType === "GUEST" ? "이 브라우저의 기록은 쿠키로 기억됩니다. 로그인하면 계정 경쟁 랭킹에 참여할 수 있어요." : "로그인 계정으로 경쟁 랭킹에 기록되었습니다."}</p><button className="submit" onClick={() => setResult(null)}>완료</button></div></div>}
  </section>;
}
