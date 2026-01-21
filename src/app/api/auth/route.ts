import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "admin1234";
const AUTH_COOKIE_NAME = "auth_token";
const AUTH_TOKEN_VALUE = "authenticated_user_session";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    if (password !== AUTH_PASSWORD) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 인증 성공 - 쿠키 설정
    const response = NextResponse.json({ success: true });

    response.cookies.set(AUTH_COOKIE_NAME, AUTH_TOKEN_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "인증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // 로그아웃
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

export async function GET() {
  // 인증 상태 확인
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

  const isAuthenticated = authCookie?.value === AUTH_TOKEN_VALUE;

  return NextResponse.json({ authenticated: isAuthenticated });
}
