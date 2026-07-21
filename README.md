# Cronews

2024 뉴스 빅데이터 해커톤에서 진행한 뉴스 기반 가로세로 퀴즈 서비스의 프론트엔드 프로토타입입니다. 뉴스를 직접 읽지 않는 사용자도 게임을 통해 시사 키워드를 접하고, 관련 기사로 자연스럽게 이동하도록 설계했습니다.

[Project Page](https://9un.site/projects/news-bigdata-hackathon)

![Cronews preview](https://github.com/user-attachments/assets/3cd90352-f3e3-4be6-813f-bbe2aae5f64a)

## Overview

- 뉴스 키워드를 기반으로 한 가로세로 낱말 퀴즈
- 제한 시간과 진행 바를 활용한 게임형 사용자 경험
- 퀴즈 칸 선택 시 관련 힌트와 기사 링크 제공
- 제출 완료 후 체험 종료 페이지로 이동
- 해커톤 발표와 시연을 위한 모바일형 프로토타입 UI

## Tech Stack

- Next.js 15
- React 19 RC
- TypeScript
- Tailwind CSS

## Main Features

### Crossword News Quiz

뉴스 데이터에서 도출한 시사 키워드를 가로세로 퀴즈 형태로 제공합니다. 사용자는 정답을 직접 입력하며 키워드를 접하고, 모르는 문제는 힌트와 연결된 기사 링크를 통해 원문 맥락을 확인할 수 있습니다.

### Game Based Learning Flow

뉴스를 읽는 행위에 부담을 느끼는 사용자도 게임을 통해 시사 이슈를 접할 수 있도록 제한 시간, 진행 바, 입력 칸 강조 효과를 구성했습니다. 뉴스 학습을 정보 탐색이 아니라 플레이 경험으로 바꾸는 데 초점을 맞췄습니다.

### News Article Connection

각 문제는 실제 기사 링크와 연결됩니다. 사용자가 퀴즈를 풀다가 궁금한 키워드를 발견하면 해당 기사로 이동할 수 있어, 게임 이후에도 뉴스 소비로 이어지는 흐름을 만들었습니다.

## Project Structure

```text
src
├── app
│   ├── easter-eggs
│   ├── video
│   ├── layout.tsx
│   └── page.tsx
└── app/globals.css

public
├── images
└── video.mp4
```

## Result

- 한국언론진흥재단 주최 2024 뉴스 빅데이터 해커톤 최우수상
- 120여 개 참가팀 중 상위 10개 본선팀 진출
- 팀장과 개발 PM을 맡아 서비스 기획 전반, 사용자 흐름 정리, 웹 개발을 담당

## Focus

이 저장소는 해커톤 시연을 위한 프론트엔드 프로토타입입니다. 전체 프로젝트에서는 빅카인즈 API와 LLM 기반 뉴스 키워드 생성 흐름을 함께 기획했으며, 이 프론트엔드는 사용자가 실제로 퀴즈를 풀고 기사로 이동하는 경험을 보여주는 역할을 담당했습니다.
