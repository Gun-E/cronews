"use client"

import Image from 'next/image';
import { useEffect, useState } from "react";

export default function Home() {
    const [time, setTime] = useState(30 * 60); // 초기 시간 30분(초 단위)
    const totalTime = 30 * 60; // 총 시간 (30분)

    // 초를 MM:SS 형식으로 변환
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    // 시간에 맞게 사각형의 너비 계산
    const calculateWidth = () => {
        return (time / totalTime) * 297.65; // 초기 너비 297.65px에서 시간에 비례하여 줄어듬
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setTime((prevTime) => {
                if (prevTime <= 0) {
                    clearInterval(interval); // 타이머 중지
                    return 0;
                }
                return prevTime - 1; // 1초씩 감소
            });
        }, 1000); // 1초마다 실행

        return () => clearInterval(interval); // 컴포넌트 언마운트 시 클리어
    }, []);

    return (
        <div className="crosscontainer">
            <Image
                src="/images/logo.svg"
                alt="logo"
                style={{
                    objectFit: 'cover'
                }}
                className="logo"
                width={100.58}
                height={17.28}
            />
            <div
                className="absolute top-[90px] left-[163px] flex items-center justify-center gap-[4.57px]"
            >
                <Image
                    src="/images/clock.svg"
                    alt="clock"
                    width={15.22}
                    height={15.22}
                    className="object-cover"
                />
                <h1 className="mt-0.5 text-[16.22px] font-medium text-[#474C88] font-pretendard">
                    {formatTime(time)}
                </h1>
            </div>
            <div style={{
                position: 'absolute',
                top: '117.22px',
                left: '47.17px',
            }}>
                <div
                    className="absolute top-0 left-0 w-[297.65px] h-[12.78px] bg-white rounded-[21.91px]"
                />
                {/* 시간에 맞게 너비가 변하는 두 번째 사각형 */}
                <div
                    className="absolute top-0 left-0 h-[12.78px] bg-[#8E95EF] rounded-[21.91px]"
                    style={{
                        width: `${calculateWidth()}px`, // width를 동적으로 변경
                        transition: 'width 1s ease-out', // 부드럽게 너비가 줄어드는 효과
                    }}
                />
            </div>

            <Image
                src="/images/grid.svg"
                alt="gridcontainer"
                style={{
                    objectFit: 'cover'
                }}
                className="gridcontainer"
                width={324}
                height={429}
            />
            <div className="textcontainer">
            </div>
        </div>
    );
}
