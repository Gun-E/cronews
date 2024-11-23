"use client";

import Image from 'next/image';
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home(): JSX.Element {
    const [time, setTime] = useState<number>(30 * 60);
    const totalTime: number = 30 * 60;

    const words: [string, (number | number[])][] = [
        ['서', 0], ['울', 0], ['지', [0,1]], ['하', 0], ['철', 0], ['', -1],
        ['', -1], ['', -1], ['성', 1], ['', -1], ['', -1], ['', -1],
        ['', -1], ['임', 2], ['원', [1,2]], ['인', [2,3]], ['사', 2], ['', -1],
        ['', -1], ['', -1], ['', -1], ['력', 3], ['', -1], ['국', 5],
        ['', -1], ['', -1],  ['', -1],['충', 3], ['', -1], ['민', 5],
        ['최', 4], ['고', 4], ['위', 4], ['원', [3,4]], ['회', 4], ['의', [4,5]],
        ['', -1], ['', -1], ['', -1], ['', -1], ['', -1], ['힘', 5],
        ['', -1], ['', -1], ['', -1], ['', -1], ['', -1], ['', -1],
    ];

    const clues: [string, string][] = [
        ['철도노조와 함께 총파업을 예고하고 태업에 들어간 교통기관은 어디입니까?', 'https://www.newscj.com/news/articleView.html?idxno=3202489'],
        ['현대자동차 브랜드 마케팅 본부장의 이름은?', 'https://www.ajunews.com/view/20241121104052101'],
        ['LG CNS가 이번에 발표한 것은 어떤 종류의 인사였습니까?', 'https://www.businesspost.co.kr/BP?command=article_view&num=373762'],
        ['철도노조의 주요 요구사항 중 하나로, 신규 노선 운영을 위해 필요한 것은 무엇입니까?', 'https://www.pressian.com/pages/articles/2024112112144836499'],
        ['이 발표가 이루어진 회의체의 명칭은 무엇입니까?', 'https://www.inews24.com/view/1785077'],
        ['박찬대 원내대표가 기자회견에서 어느 정당에 대해 국정조사 협조를 촉구했나요?', 'https://news.kbs.co.kr/news/pc/view/view.do?ncd=8111700'],
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
