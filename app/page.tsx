import { redirect } from "next/navigation"

// 진입점: 메인(/main)으로 리다이렉트
export default function HomePage() {
  redirect("/main")
}
