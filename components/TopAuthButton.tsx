"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** 로그인 여부(기기 토큰)에 따라 로그인 / 마이페이지 버튼 표시 */
export default function TopAuthButton() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    try {
      setLoggedIn(!!localStorage.getItem("hb_device_token"));
    } catch {}
  }, []);
  return (
    <Link
      href={loggedIn ? "/mypage" : "/login"}
      className="rounded-xl bg-forest px-4 py-2 text-sm font-black text-white"
    >
      {loggedIn ? "마이페이지" : "로그인"}
    </Link>
  );
}
