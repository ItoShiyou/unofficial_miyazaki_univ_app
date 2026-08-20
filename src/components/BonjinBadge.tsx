"use client";

import { useRef, useState } from "react";
import Image from "next/image";

/**
 * mp4は静止ロゴ(png)に動きをつけたものなので、再生完了と同時にpngへ
 * 切り替えることでワンショットのアニメーションとして見せている。
 */
export default function BonjinBadge() {
  const [showVideo, setShowVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div
      className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0"
      title="THE BONJIN"
    >
      {showVideo && (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => setShowVideo(false)}
        >
          <source src="/bonjin/bonjin_rogo.mp4" type="video/mp4" />
        </video>
      )}
      {!showVideo && (
        <Image
          src="/bonjin/thebonjin_rogo.png"
          alt="THE BONJIN"
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
