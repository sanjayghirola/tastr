// AuthLayout — centered card on warm beige background
// Used for: Login, Register, OTP, Forgot Password, Profile Setup

export default function AuthLayout({ children, showLogo = true }) {
  return (
    <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      {showLogo && (
        <div className="mb-8 text-center">
          <span className="text-4xl font-extrabold text-brand-500 tracking-tight">Tastr</span>
          <p className="text-sm text-text-muted mt-1">Good food, delivered fast</p>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-md bg-bg-card rounded-3xl shadow-modal p-8 animate-fade-up">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-text-muted text-center">
        © {new Date().getFullYear()} Tastr. All rights reserved.
      </p>
    </div>
  )
}
