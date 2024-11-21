"use client"

import Image from 'next/image';
import {useEffect, useState} from "react";

export default function Home() {
    const [time, setTime] = useState(30 * 60);
    const totalTime = 30 * 60;

    const [textArray, setTextArray] = useState<string[]>([
        '', '', '', '', '', '',
        '', '', '캐', '', '', '',
        '', '매', '치', '컷', '', '',
        '듀', '스', '', '', '', '',
        '', '티', '저', '레', '더', '',
        '', '지', '', '', '', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
    ]);
    const horizontalClues = [
        '시각적으로 유사한 두 장면(숏, shot)를 이어 붙이는 필름 편집 방식',
        '테니스, 탁구, 배구 등의 구기 종목에서 승패를 가르는 마지막 1점을 두고 동점을 이루고 있는 것',
        '잠재투자자에게 매각물건에 대한 간략한 정보를 제공, 투자를 유도하는 투자 안내문',
    ];

    const verticalClues = [
        '야구 경기에서 야수가 인플라이트의 타구 또는 송구를 손 또는 글러브로 확실하게 받아서 정확하게 움켜 쥐는 행위. 포구(捕球)라고도 함',
        '가격은 명품에 비해 싸지만 품질면에서는 명품에 근접한 상품을 지칭',
    ];

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "00")}`;
    };

    const calculateWidth = () => {
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

    const getBackgroundColor = (char: string) => {
        if (char === '') {
            return '#E8F1F6'; // Default empty cell color
        }
        return '#8E95EF'; // Color for the cells that need input
    };

    // Handle input change (updating the text array when user types)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const newTextArray = [...textArray];
        newTextArray[index] = e.target.value;
        setTextArray(newTextArray);
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
            <div className="absolute top-[90px] left-[163px] flex items-center justify-center gap-[4.57px]">
                <Image
                    src="/images/clock.svg"
                    alt="clock"
                    width={15.22}
                    height={15.22}
                    className="object-cover"
                />
                <h1 className="text-[16.22px] font-medium text-[#474C88] font-pretendard">
                    {formatTime(time)}
                </h1>
            </div>

            <div style={{position: 'absolute', top: '117.22px', left: '47.17px'}}>
                <div className="absolute top-0 left-0 w-[297.65px] h-[12.78px] bg-white rounded-[21.91px]"/>
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
                            backgroundColor: getBackgroundColor(char),
                        }}
                    >
                        {char === '' ? (
                            <input
                                type="text"
                                maxLength={1}
                                onChange={(e) => handleInputChange(e, index)}
                                className="w-full h-full text-center border-none bg-transparent outline-none"
                                value={char}
                            />
                        ) : (
                            char
                        )}
                    </div>
                ))}
            </div>


            {horizontalClues.map((clue, index) => (
                <div className="textcontainer" key={index}>{index + 1}. {clue}</div>
            ))}

            <div className="wordinputs">
                <div className="wordinput">
                    {/*글자 크기에 맞는 입력란*/}
                    <div className="ret"></div>
                    <div className="ret"></div>
                    <div className="ret"></div>
                    <div className="ret"></div>
                </div>
            </div>
        </div>
    );
}
