"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // 🔓 Firebase logout
      await signOut(auth);

      // 🧹 Clear stored role
      localStorage.removeItem("role");

      // 🔁 Redirect to login
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="app-button"
      suppressHydrationWarning
    >
      Logout
    </button>
  );
}
