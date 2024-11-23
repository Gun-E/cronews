import Image from "next/image";
import Link from "next/link";

export default function Home(): JSX.Element {

    return (
        <div className="eggs">
            <Image
                src="/images/logo.svg"
                alt="logo"
                style={{objectFit: 'cover'}}
                width={201.16}
                height={24.57}
            />
            <div className="mt-10">
                크로뉴스를 플레이 해주셔서 감사합니다.
                <br/>
                체험이 종료 되었습니다.
            </div>
            <Link href="https://newsbigdata.kr/" className="bigdata">
                2024 뉴스빅데이터 해커톤
            </Link>
        </div>
    );
}
