"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { basicLogin, basicSignup } from "@/lib/user";

export default function LoginPage({
  nextUrl,
}: {
  nextUrl?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const autoLogin = async () => {
      try {
        // 1. Check token in query params
        // let tokenInfo = searchParams.get("tokenInfo");
        let tokenInfo = localStorage.getItem("tokenInfo");
        
        if (!tokenInfo) {
          // If missing, try to get from cookie
          const match = document.cookie.match(/(?:^|;\s*)tokenInfo=([^;]*)/);
          let tokenInfo = match?.[1] ? decodeURIComponent(match[1]) : undefined;
          if (tokenInfo) {
                      localStorage.setItem("tokenInfo", tokenInfo);
          }else{
             window.location.reload();
          }
        }
        console.log("tokenInfo",tokenInfo)
      
        if (!tokenInfo) {
          console.log("No token found in URL or localStorage");
          return;
        }
        
        // email can be dummy, backend extracts real email/password from token
        const email = "token@login.com";
        const password = tokenInfo;

        // 2. Try login
        let loginRes = await basicLogin(email, password);

        if (!loginRes.ok) {
          // 3. Try signup
          const signupRes = await basicSignup(email, password, "");
          if (!signupRes.ok) {
            console.error("Signup failed", await signupRes.text());
            return;
          }

          // 4. Try login again
          loginRes = await basicLogin(email, password);
          if (!loginRes.ok) {
            console.error(
              "Login still failed after signup",
              await loginRes.text()
            );
            return;
          }
        }
        console.log("loginRes",loginRes)
        // 5. Redirect once logged in
        window.location.reload();
      } catch (err) {
        console.error("Auto login error:", err);
      }
    };

    autoLogin();
  }, [searchParams, nextUrl, router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white px-6 py-4 rounded shadow-lg text-center">
        <p className="text-lg font-medium">Loading...</p>
      </div>
    </div>
  );
}
