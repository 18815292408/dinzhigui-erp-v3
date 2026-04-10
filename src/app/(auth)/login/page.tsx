import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-apple-gray-50 relative overflow-hidden">
      {/* Apple-style background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-apple-gray-50 to-pink-100" />

      {/* Decorative circles like iOS wallpaper */}
      <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-apple-blue/10 to-apple-purple/10 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-apple-green/10 to-apple-blue/10 blur-3xl" />

      {/* Login card - Apple glassmorphism style */}
      <div className="relative w-full max-w-[420px] mx-4">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-white/50 overflow-hidden">
          {/* Header area */}
          <div className="pt-12 pb-8 px-10 text-center">
            {/* App icon placeholder */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-[22px] bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center shadow-lg shadow-apple-blue/30">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3h4.5v3" />
              </svg>
            </div>
            <h1 className="text-[28px] font-semibold text-apple-gray-900 tracking-tight">定制大师</h1>
            <p className="text-[15px] text-apple-gray-500 mt-1">全屋定制门店管理系统</p>
          </div>

          {/* Form area */}
          <div className="px-10 pb-10">
            <LoginForm />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[13px] text-apple-gray-500 mt-6">
          © 2024 定制大师. 保留所有权利。
        </p>
      </div>
    </div>
  )
}
