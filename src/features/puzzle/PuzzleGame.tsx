"use client";

import { useEffect, useMemo, useState } from "react";
import type { PuzzleBoard } from "@/server/puzzle/types";

export function PuzzleGame({ puzzle }: { puzzle: PuzzleBoard }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(puzzle.words[0]?.id ?? "");
  const [seconds, setSeconds] = useState(15 * 60);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const active = puzzle.words.find((word) => word.id === selected) ?? puzzle.words[0];
  const correct = useMemo(() => puzzle.words.filter((word) => (answers[word.id] ?? "").normalize("NFC").toUpperCase() === word.answer).length, [answers, puzzle.words]);
  return (
    <section className="game-shell">
      <header className="game-header"><strong>CRONEWS</strong><span>오늘의 뉴스 퍼즐</span><time>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</time></header>
      <div className="game-layout">
        <div className="board" style={{ gridTemplateColumns: `repeat(${puzzle.width}, 1fr)` }}>
          {puzzle.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => {
            if (!cell) return <span className="cell blocked" key={`${rowIndex}-${colIndex}`} />;
            const owners = puzzle.words.filter((word) => {
              const offset = word.direction === "ACROSS" ? colIndex - word.col : rowIndex - word.row;
              return offset >= 0 && offset < word.answer.length && (word.direction === "ACROSS" ? rowIndex === word.row : colIndex === word.col);
            });
            const word = owners.find((owner) => owner.id === selected) ?? owners[0];
            const offset = word.direction === "ACROSS" ? colIndex - word.col : rowIndex - word.row;
            const value = answers[word.id]?.[offset] ?? "";
            return <button className={`cell ${owners.some((owner) => owner.id === selected) ? "active" : ""}`} key={`${rowIndex}-${colIndex}`} onClick={() => setSelected(word.id)}>{submitted ? cell : value}</button>;
          }))}
        </div>
        <aside className="clue-panel">
          <span className="clue-number">{puzzle.words.findIndex((word) => word.id === active.id) + 1} / {puzzle.words.length}</span>
          <h2>{active.question}</h2>
          <input aria-label="정답" value={answers[active.id] ?? ""} maxLength={active.answer.length} disabled={submitted} onChange={(event) => setAnswers((current) => ({ ...current, [active.id]: event.target.value.replace(/\s/g, "") }))} placeholder={`${active.answer.length}글자`} />
          <div className="clue-list">{puzzle.words.map((word, index) => <button className={word.id === active.id ? "selected" : ""} onClick={() => setSelected(word.id)} key={word.id}>{index + 1}. {word.question}</button>)}</div>
          <button className="submit" onClick={() => setSubmitted(true)}>{submitted ? `${puzzle.words.length}문제 중 ${correct}문제 정답` : "정답 제출"}</button>
        </aside>
      </div>
    </section>
  );
}
