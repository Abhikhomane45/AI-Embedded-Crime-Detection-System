"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Shield, User, Lock, Mail } from "lucide-react";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      const uid = user.uid;

      const tokenResult = await user.getIdTokenResult(true);
      const role = tokenResult.claims?.role;

      if (!role) {
        setError("User role not assigned. Contact admin.");
        await auth.signOut();
        return;
      }

      if (loginType !== role) {
        setError(
          role === "admin"
            ? "Please login as Admin"
            : "Please login as Operator"
        );
        await auth.signOut();
        return;
      }

      const collectionName = role === "operator" ? "operators" : "users";
      const profileSnap = await getDoc(doc(db, collectionName, uid));

      if (!profileSnap.exists()) {
        setError(
          role === "operator"
            ? "Operator profile not found"
            : "Admin profile not found"
        );
        await auth.signOut();
        return;
      }

      localStorage.setItem("role", role);
      localStorage.setItem("uid", uid);

      if (role === "admin") {
        router.replace("/dashboard/admin");
      } else {
        router.replace("/dashboard/operator");
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex items-center justify-center p-4" suppressHydrationWarning>
      <div className="w-full max-w-lg app-card p-8 lg:p-12">
        <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="app-badge mx-auto w-fit">Secure access</div>
                <h2 className="mt-4 text-2xl font-semibold text-slate-900">Sign in</h2>
                <p className="text-slate-600 mt-2">Use your assigned credentials to continue</p>
              </div>

              {/* Role Selection */}
              <div className="mb-8">
                <div className="flex bg-slate-100/80 rounded-lg p-1 text-slate-700">
                  <button
                    type="button"
                    onClick={() => setLoginType("admin")}
                    className={`flex-1 py-3 px-4 rounded-md flex items-center justify-center space-x-2 transition-all ${
                      loginType === "admin"
                        ? "bg-white shadow text-slate-900"
                        : "hover:bg-white/70"
                    }`}
                    suppressHydrationWarning
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginType("operator")}
                    className={`flex-1 py-3 px-4 rounded-md flex items-center justify-center space-x-2 transition-all ${
                      loginType === "operator"
                        ? "bg-white shadow text-slate-900"
                        : "hover:bg-white/70"
                    }`}
                    suppressHydrationWarning
                  >
                    <User className="w-4 h-4" />
                    <span>Operator</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
                  <div className="flex items-center text-rose-700 text-sm">
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="app-input pl-10"
                      placeholder="Enter your email"
                      required
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="app-input pl-10"
                      placeholder="Enter your password"
                      required
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="app-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  suppressHydrationWarning
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <p className="text-center text-sm text-slate-600">
                  Need help?{" "}
                  <a href="#" className="text-slate-900 hover:text-slate-700">
                    Contact support
                  </a>
                </p>
              </div>
        </div>
      </div>
    </div>
  );
}
