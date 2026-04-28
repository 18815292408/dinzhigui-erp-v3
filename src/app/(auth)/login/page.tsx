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
            {/* App logo */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-[22px] overflow-hidden shadow-lg">
              <img src="/logo.png" alt="定制大师" className="w-full h-full object-cover" />
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
