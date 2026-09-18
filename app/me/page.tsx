import Placeholder from "@/components/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="회원가입 · 내 정보"
      subtitle="이름·전화 · 인증 없음"
      back="/"
      note="이름·전화번호만 받고, 영수증 신청 체크 시에도 주민번호는 저장하지 않습니다(기부처가 홈택스 휴대전화번호 방식으로 발급)."
    />
  );
}
