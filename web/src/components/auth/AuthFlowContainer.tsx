import Link from "next/link";
import { Logo } from "../logo/Logo";

export default function AuthFlowContainer({
  children,
  authState,
}: {
  children: React.ReactNode;
  authState?: "signup" | "login" | "join";
}) {
  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md bg-black pt-8 pb-6 px-8 mx-4 gap-y-4 bg-white flex items-center dark:border-none flex-col rounded-xl shadow-lg border border-bacgkround-100 gap-y-2 ">
        <Logo width={70} height={70} />
        <div className="mt-4  w-full">{children}</div>
      </div>
     
    </div>
  );
}
