"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

// ── Global premium easing ─────────────────────────────────────
export const ease = [0.22, 1, 0.36, 1] as const;

// ── Reusable variant presets ──────────────────────────────────

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const fadeDownVariants: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1 },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

export const staggerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// ── FADE UP REVEAL ────────────────────────────────────────────
interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

export function FadeUp({
  children,
  delay = 0,
  duration = 0.5,
  className,
  once = true,
}: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration, delay, ease: [...ease] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── FADE DOWN (navbar) ────────────────────────────────────────
interface FadeDownProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeDown({
  children,
  delay = 0,
  duration = 0.4,
  className,
}: FadeDownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [...ease] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── FADE IN (opacity only) ───────────────────────────────────
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  className,
  once = true,
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once, margin: "-40px" }}
      transition={{ duration, delay, ease: [...ease] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── SCALE IN ──────────────────────────────────────────────────
interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 0.5,
  className,
  once = true,
}: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration, delay, ease: [...ease] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── STAGGER CONTAINER ─────────────────────────────────────────
interface StaggerContainerProps {
  children: ReactNode;
  stagger?: number;
  delayChildren?: number;
  className?: string;
  once?: boolean;
}

export function StaggerContainer({
  children,
  stagger = 0.1,
  delayChildren = 0.15,
  className,
  once = true,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── STAGGER ITEM ──────────────────────────────────────────────
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [...ease] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── HOVER LIFT ────────────────────────────────────────────────
interface HoverLiftProps {
  children: ReactNode;
  y?: number;
  className?: string;
}

export function HoverLift({ children, y = -4, className }: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{ y, transition: { duration: 0.3, ease: [...ease] } }}
      whileTap={{ y: 0, scale: 0.98, transition: { duration: 0.15 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── FLOAT (infinite gentle bob) ───────────────────────────────
interface FloatProps {
  children: ReactNode;
  y?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function Float({
  children,
  y = -8,
  duration = 5,
  delay = 0,
  className,
}: FloatProps) {
  return (
    <motion.div
      animate={{ y: [0, y, 0] }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── PAGE REVEAL (wrap page content) ───────────────────────────
interface PageRevealProps {
  children: ReactNode;
  className?: string;
}

export function PageReveal({ children, className }: PageRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [...ease] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
