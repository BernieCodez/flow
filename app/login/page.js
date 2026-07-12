import Link from "next/link";
import { signIn } from "@/auth";

export default function Login(){
  async function googleLogin(){"use server";await signIn("google",{redirectTo:"/dashboard"})}
  return <main className="shell" style={{display:"grid",placeItems:"center"}}><div className="card" style={{width:"min(430px,90vw)",padding:"2.2rem",textAlign:"center"}}><div className="brand">flow<span className="brand-dot">.</span></div><h1 style={{fontSize:"2.4rem",marginTop:"1.5rem"}}>Welcome back</h1><p className="muted">Use your Google school or personal account. Flow never stores your password.</p><form action={googleLogin}><button className="btn secondary" style={{width:"100%",marginTop:"1rem"}} type="submit">Continue with Google</button></form>{process.env.NEXT_PUBLIC_DEMO_MODE==="true"&&<Link href="/dashboard" className="btn" style={{display:"block",marginTop:"1.5rem"}}>Preview with demo data</Link>}<p className="muted" style={{fontSize:".75rem",marginTop:"1.3rem"}}>By continuing, you agree to Flow’s Terms and Privacy Policy.</p></div></main>
}
