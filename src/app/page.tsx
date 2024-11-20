import Image from "next/image";

const images = [
  "/images/1.png",
  "/images/2.png",
  "/images/3.png",
  "/images/4.png",
];

export default function Home() {
  return (
      <div className="w-full">
        {images.map((src, index) => (
            <div key={index}>
              <Image
                  src={src}
                  alt={`image ${index + 1}`}
                  width={1920}
                  height={1080}
                  className="object-cover w-full"
              />
            </div>
        ))}
      </div>
  );
}
