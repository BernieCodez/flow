import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const providers=[];
if(process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET)providers.push(Google);
export const {handlers,auth,signIn,signOut}=NextAuth({adapter:PrismaAdapter(prisma),providers,session:{strategy:"database"},pages:{signIn:"/login"},callbacks:{session({session,user}){session.user.id=user.id;return session}}});
