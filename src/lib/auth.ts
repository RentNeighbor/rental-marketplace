import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user) return null;
        if (!user.passwordHash) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        if (user.suspendedAt) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email!;
        const existing = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (existing) {
          if (existing.suspendedAt) return false;
          user.id = existing.id;
          return true;
        }

        // Create new user for Google sign-in
        const id = uuidv4();
        await db.insert(users).values({
          id,
          name: user.name || email.split("@")[0],
          email,
          emailVerifiedAt: new Date(), // Google emails are verified
        });
        user.id = id;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.emailVerifiedAt = (user as Record<string, unknown>).emailVerifiedAt ?? null;
      }
      // For OAuth sign-ins, fetch emailVerifiedAt from DB
      if (trigger === "signIn" && !token.emailVerifiedAt && token.id) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
        });
        if (dbUser?.emailVerifiedAt) {
          token.emailVerifiedAt = dbUser.emailVerifiedAt.toISOString();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).emailVerifiedAt = token.emailVerifiedAt ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
