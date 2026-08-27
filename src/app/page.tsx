import { PuzzleGame } from "@/features/puzzle/PuzzleGame";
import { generatePuzzle } from "@/server/puzzle/generator";

const sample = generatePuzzle([
  { id: "ai", answer: "인공지능", question: "인간의 학습·추론 능력을 컴퓨터로 구현하는 기술은?" },
  { id: "economy", answer: "기준금리", question: "중앙은행이 통화 정책의 기준으로 정하는 금리는?" },
  { id: "climate", answer: "기후위기", question: "극단적 기상 현상을 심화시키는 전 지구적 문제는?" },
  { id: "satellite", answer: "인공위성", question: "지구 궤도를 돌며 통신과 관측을 수행하는 장치는?" },
  { id: "information", answer: "정보통신", question: "정보 처리와 원거리 전달 기술을 함께 이르는 말은?" },
], 11);

export default function Home() { return <main><PuzzleGame puzzle={sample} /></main>; }
