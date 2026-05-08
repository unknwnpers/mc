"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// 1. PRIMARY BUTTON
// ─────────────────────────────────────────────────────────────
interface PrimaryButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  icon?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
}

export function PrimaryButton({
  children,
  href,
  onClick,
  className,
  icon = true,
  disabled = false,
  loading = false,
  type = "button",
}: PrimaryButtonProps) {
  const classes = cn(
    "group relative inline-flex items-center justify-center gap-2.5",
    "bg-brand text-white font-semibold text-[14px]",
    "h-[52px] px-8 rounded-[14px]",
    "hover:bg-brand-dark active:scale-[0.97]",
    "shadow-[0_8px_24px_rgba(233,137,126,0.25)] hover:shadow-[0_12px_32px_rgba(233,137,126,0.30)]",
    "transition-all duration-300 ease-out",
    "disabled:opacity-50 disabled:pointer-events-none",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
        {icon && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled || loading} type={type} className={classes}>
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {children}
          {icon && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
        </>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. SECONDARY BUTTON
// ─────────────────────────────────────────────────────────────
interface SecondaryButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SecondaryButton({
  children,
  href,
  onClick,
  className,
  disabled = false,
}: SecondaryButtonProps) {
  const classes = cn(
    "group inline-flex items-center justify-center",
    "bg-white text-ink font-semibold text-[14px]",
    "h-[52px] px-8 rounded-[14px]",
    "border border-[rgba(233,137,126,0.12)]",
    "hover:bg-brand hover:text-white hover:border-brand",
    "active:scale-[0.97]",
    "transition-all duration-300 ease-out",
    "disabled:opacity-50 disabled:pointer-events-none",
    className
  );

  if (href) {
    return <Link href={href} className={classes}>{children}</Link>;
  }

  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. SECTION HEADING
// ─────────────────────────────────────────────────────────────
interface SectionHeadingProps {
  label?: string;
  title: string;
  highlight?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  label,
  title,
  highlight,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn(
      "space-y-3",
      align === "center" && "text-center",
      className
    )}>
      {label && (
        <p className="text-brand font-semibold text-label tracking-wide">
          {label}
        </p>
      )}
      <h2 className="text-section-mobile md:text-section font-serif font-bold text-ink">
        {title}{" "}
        {highlight && <span className="text-brand italic">{highlight}</span>}
      </h2>
      {description && (
        <p className={cn(
          "text-ink-muted text-body",
          align === "center" ? "max-w-lg mx-auto" : "max-w-xl"
        )}>
          {description}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. TRUST BADGE
// ─────────────────────────────────────────────────────────────
interface TrustBadgeProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function TrustBadge({ icon: Icon, title, description, className }: TrustBadgeProps) {
  return (
    <div className={cn("flex flex-col items-center text-center group cursor-default", className)}>
      <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand flex items-center justify-center mb-3 group-hover:scale-110 group-hover:shadow-soft-hover transition-all duration-300">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-label font-semibold text-ink leading-tight">{title}</p>
      {description && (
        <p className="text-label-sm text-ink-light mt-0.5">{description}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. ICON CIRCLE
// ─────────────────────────────────────────────────────────────
interface IconCircleProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "brand" | "white";
  className?: string;
}

export function IconCircle({ icon: Icon, size = "md", variant = "default", className }: IconCircleProps) {
  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-12 h-12",
    lg: "w-14 h-14",
  };
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };
  const variantClasses = {
    default: "bg-brand-50 text-brand",
    brand: "bg-brand text-white",
    white: "bg-white/10 border border-white/10 text-white",
  };

  return (
    <div className={cn(
      "rounded-xl flex items-center justify-center shrink-0",
      sizeClasses[size],
      variantClasses[variant],
      className
    )}>
      <Icon className={iconSizes[size]} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. PREMIUM CONTAINER
// ─────────────────────────────────────────────────────────────
interface PremiumContainerProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
  bg?: "default" | "white" | "warm";
}

export function PremiumContainer({
  children,
  className,
  as: Component = "section",
  bg = "default",
}: PremiumContainerProps) {
  const bgClasses = {
    default: "bg-[#FFF9F6]",
    white: "bg-white",
    warm: "bg-[#F8F1EC]",
  };

  return (
    <Component className={cn("section-padding", bgClasses[bg], className)}>
      <div className="section-container">
        {children}
      </div>
    </Component>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. CATEGORY CARD
// ─────────────────────────────────────────────────────────────
interface CategoryCardProps {
  title: string;
  subtitle?: string;
  image: string;
  href: string;
  className?: string;
}

export function CategoryCard({ title, subtitle, image, href, className }: CategoryCardProps) {
  return (
    <Link href={href} className={cn("group relative overflow-hidden rounded-[24px] block h-full", className)}>
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.2s] ease-out"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <p className="text-label-sm font-medium text-white/50 uppercase tracking-wider mb-1.5">Collection</p>
        <h3 className="text-[22px] md:text-[26px] font-serif font-bold text-white tracking-tight leading-tight mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-white/60 text-[14px] mb-3 max-w-[260px]">{subtitle}</p>
        )}
        <div className="inline-flex items-center gap-2 text-white text-label font-semibold opacity-70 group-hover:opacity-100 group-hover:gap-3 transition-all duration-300">
          <span>Explore</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. REEL CARD
// ─────────────────────────────────────────────────────────────
interface ReelCardProps {
  thumbnail: string;
  views: string;
  link: string;
}

export function ReelCard({ thumbnail, views, link }: ReelCardProps) {
  const { Play, Eye } = require("lucide-react");
  return (
    <Link
      href={link}
      target="_blank"
      className="relative min-w-[180px] md:min-w-[220px] aspect-[9/16] rounded-[24px] overflow-hidden group snap-start"
    >
      <img
        src={thumbnail}
        alt="Instagram Reel"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.2s] ease-out"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center scale-80 group-hover:scale-100 transition-transform duration-400">
          <Play className="w-4 h-4 text-white fill-current ml-0.5" />
        </div>
      </div>
      <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white">
        <Eye className="w-3.5 h-3.5" />
        <span className="text-label-sm font-medium">{views}</span>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. NEWSLETTER BOX
// ─────────────────────────────────────────────────────────────
interface NewsletterBoxProps {
  className?: string;
}

export function NewsletterBox({ className }: NewsletterBoxProps) {
  return (
    <div className={cn(
      "bg-gradient-to-br from-brand-50 via-white to-brand-50 rounded-[24px] md:rounded-[32px]",
      "px-6 md:px-14 py-12 md:py-16",
      "border border-[rgba(233,137,126,0.08)]",
      "relative overflow-hidden",
      className
    )}>
      {/* Soft glow */}
      <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-brand/[0.03] rounded-full blur-[60px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      <div className="relative z-10 text-center max-w-md mx-auto">
        <p className="text-brand font-semibold text-label mb-3">Join Our Community</p>
        <h3 className="text-[24px] md:text-[32px] font-serif font-bold text-ink tracking-tight leading-tight mb-3">
          Get Exclusive Offers &{" "}
          <span className="text-brand italic">Early Access</span>
        </h3>
        <p className="text-ink-muted text-[14px] mb-6">
          Be the first to know about new arrivals and special offers.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 bg-white border border-[rgba(233,137,126,0.12)] rounded-[14px] px-5 h-[52px] text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/15 focus:border-brand/20 transition-all"
          />
          <PrimaryButton icon={false} className="sm:w-auto">
            Subscribe
          </PrimaryButton>
        </div>
        <p className="text-label-sm text-ink-faint mt-3">No spam, ever. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 10. PREMIUM CARD (generic card wrapper)
// ─────────────────────────────────────────────────────────────
interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

export function PremiumCard({
  children,
  className,
  hover = true,
  padding = "md",
}: PremiumCardProps) {
  const paddingClasses = {
    sm: "p-4 md:p-5",
    md: "p-6 md:p-7",
    lg: "p-8 md:p-10",
  };

  return (
    <div className={cn(
      "bg-white rounded-[24px] border border-[rgba(233,137,126,0.12)] shadow-soft",
      paddingClasses[padding],
      hover && "hover:-translate-y-1 hover:shadow-soft-lg transition-all duration-300 ease-out",
      className
    )}>
      {children}
    </div>
  );
}
