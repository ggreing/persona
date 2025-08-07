// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google"; // 예시: 구글 OAuth

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Kakao, Naver 등도 동일하게 추가 가능
  ],
  callbacks: {
    async session({ session, token }) {
      // 사용자 세션 커스터마이징 가능
      return session;
    },
  },
});

export { handler as GET, handler as POST };
