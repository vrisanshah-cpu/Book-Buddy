import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "kids";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-slate-950 text-white shadow-sm hover:-translate-y-0.5 hover:bg-slate-800 disabled:hover:translate-y-0 disabled:opacity-50",
  secondary:
    "border-2 border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  kids: "min-h-[48px] bg-kids-purple text-white shadow-[0_5px_0_#4c1d95] hover:-translate-y-0.5 hover:bg-violet-700 disabled:hover:translate-y-0 disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", fullWidth, children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
