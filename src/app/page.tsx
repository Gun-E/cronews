"use client";

import Image from 'next/image';
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home(): JSX.Element {
    const [time, setTime] = useState<number>(30 * 60);
    const totalTime: number = 30 * 60;

    const words: [string, (number | number[])][] = [
        ['공', 0], ['', -1], ['', -1], ['', -1], ['', -1], ['', -1],
        ['동', 0], ['', -1], ['현', [2,3]], ['대', 2], ['차', 2], ['', -1],
        ['성', 0], ['', -1], ['신', 3], ['', -1], ['', -1], ['', -1],
        ['명', [0,1]], ['태', 1], ['균', [1,3]], ['', -1], ['', -1], ['', -1],
        ['', -1], ['', -1],  ['', -1],['', -1], ['', -1], ['회', 5],
        ['', -1], ['', -1], ['위', [4,6]], ['증', 4], ['교', 4], ['사', [4,5]],
        ['', -1], ['', -1], ['기', 6], ['', -1], ['', -1], ['채', 5],
        ['', -1], ['', -1], ['설', 6], ['', -1], ['', -1], ['', -1],
    ];


    const clues: [string, string][] = [
        ['16개 주요 기업의 사장단이 한자리에 모여 경제성장률 2% 달성의 어려움과 내수 침체를 우려하며 정부와 국회에 경제 살리기를 위한 지원을 요청하며 발표한 것은?', 'https://www.donga.com/news/Opinion/article/all/20241121/130479357/2'],
        ['2021년 서울시장 보궐선거 당시 오세훈 후보 선거캠프에 여론조사 자료를 건네고 선거 전략을 짰다고 주장하는 정치 브로커는?', 'https://www.munhwa.com/news/view.html?no=2024112201039910021001'],
        ['어떤 자동차 브랜드가 로스앤젤레스에서 새로운 전동화 SUV를 공개했습니까?', 'https://www.yna.co.kr/view/PYH20241122014900013'],
        ['LG CNS가 올해 3분기 누적 매출 약 4조원의 견조한 실적을 기록하는 데 공헌하여 사장 승진 인사를 받은 부사장은?', 'https://www.smartfn.co.kr/article/view/sfn202411220016'],
        ['김진성씨에게 허위 증언을 요구했다는 혐의로 검찰이 이재명 대표를 지난해 10월 기소한 죄목은?', 'https://www.hani.co.kr/arti/society/society_general/1168981.html'],
        ['롯데케미칼이 과거 발행한 2조450억 원 규모의 재무약정 위반 사유가 발생하여 롯데그룹 위기설의 시작점이 된 것은?', 'https://www.donga.com/news/Economy/article/all/20241121/130477952/2'],
        ['롯데그룹이 이례적으로 56조 원의 부동산 자산과 15조4000억 원의 가용예금을 공개하며 해명한 것은?', 'https://www.donga.com/news/Economy/article/all/20241121/130477952/2'],
    ];


    const [textArray, setTextArray] = useState<string[]>(words.map(() => ''));

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "00")}`;
    };

    const calculateWidth = (): number => {
        return (time / totalTime) * 297.65;
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setTime((prevTime) => {
                if (prevTime <= 0) {
                    clearInterval(interval);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number): void => {
        const input = e.target.value.trim();
        const koreanRegex = /^[가-힣]{1}$/;

        if (input === "" || koreanRegex.test(input)) {
            const newTextArray = [...textArray];
            newTextArray[index] = input;
            setTextArray(newTextArray);
        }
    };

    const [selectedClueIndex, setSelectedClueIndex] = useState<number | null>(null);

    const handleFocus = (index: number) => {
        const [, clueIndex] = words[index];
        if (Array.isArray(clueIndex)) {
            setSelectedClueIndex(clueIndex[0]);
        } else if (clueIndex >= 0) {
            setSelectedClueIndex(clueIndex);
        } else {
            setSelectedClueIndex(null);
        }
    };

    const getBackgroundColor = (index: number): string => {
        const [, clueIndices] = words[index];
        if (words[index][0] === '') {
            return '#E8F1F6';
        }
        if (Array.isArray(clueIndices)) {
            return clueIndices.includes(selectedClueIndex ?? -1) ? '#515DF1' : '#8E95EF';
        }
        return clueIndices === selectedClueIndex ? '#515DF1' : '#8E95EF';
    };
    const isSubmitDisabled = (): boolean => {
        return textArray.some((text, index) => words[index][0] !== '' && text === '');
    };

    return (
        <div className="crosscontainer">
            <Image
                src="/images/logo.svg"
                alt="logo"
                style={{objectFit: 'cover'}}
                className="logo"
                width={100.58}
                height={17.28}
            />
            <div className="clock-container">
                <Image
                    src="/images/clock.svg"
                    alt="clock"
                    width={15.22}
                    height={15.22}
                    className="object-cover"
                />
                <h1 className="clock-text">
                    {formatTime(time)}
                </h1>
            </div>

            <div className="progresscontainer">
                <div
                    className="absolute top-0 left-0 w-[297.65px] h-[12.78px] bg-white rounded-[21.91px]"
                    style={{
                        boxShadow: '0 7.3px 14.61px 0 rgba(54, 16, 166, 0.25)',
                    }}
                />
                <div
                    className="absolute top-0 left-0 h-[12.78px] bg-[#8E95EF] rounded-[21.91px]"
                    style={{width: `${calculateWidth()}px`, transition: 'width 1s ease-out'}}
                />
            </div>

            <div className="gridcontainer">
                {textArray.map((char, index) => (
                    <div
                        key={index}
                        className="inputbox"
                        style={{
                            backgroundColor: getBackgroundColor(index),
                        }}
                    >
                        {words[index][0] === '' && words[index][1] === -1 ? null : (
                            <input
                                type="text"
                                maxLength={1}
                                onFocus={() => handleFocus(index)} // Handle focus event
                                onChange={(e) => handleInputChange(e, index)}
                                className="w-full h-full text-center border-none bg-transparent outline-none"
                                value={textArray[index]}
                            />
                        )}
                    </div>
                ))}
            </div>

            {selectedClueIndex !== null && (
                <div className="textcontainer">
                    <a
                        href={clues[selectedClueIndex][1]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black underline"
                    >
                        {clues[selectedClueIndex][0]}
                    </a>
                </div>
            )}
            <Link
                href={isSubmitDisabled() ? "#" : "/easter-eggs"} // 비활성화 상태에서는 링크 없음
                className="submitbtn"
                style={{
                    pointerEvents: isSubmitDisabled() ? "none" : "auto",
                    backgroundColor: isSubmitDisabled() ? "#878787" : "#515DF1",
                    textAlign: "center",
                    padding: "10px 20px",
                    borderRadius: "5px",
                    color: "#fff",
                    fontWeight: "bold",
                    textDecoration: "none",
                }}
            >
                제출
            </Link>
        </div>
    );
}
