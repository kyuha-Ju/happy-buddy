import ScreenHeader from "@/components/ScreenHeader";
import MeForm from "@/components/MeForm";

export default function Page() {
  return (
    <main>
      <ScreenHeader title="회원가입 · 내 정보" subtitle="이름·전화 · 인증 없음" back="/" />
      <MeForm />
    </main>
  );
}
