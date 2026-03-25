'use client';

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, BriefcaseIcon } from "lucide-react";

interface RoleSelectionLandingProps {
  onSelect: () => void;
}

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1.5 L13.6 6.8 L19 8 L13.6 9.2 L12 14.5 L10.4 9.2 L5 8 L10.4 6.8 Z" />
    <path d="M5 15 L5.9 17.6 L8.5 18.5 L5.9 19.4 L5 22 L4.1 19.4 L1.5 18.5 L4.1 17.6 Z" opacity="0.7" />
  </svg>
);

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  accentColor: string;
  glowColor: string;
  onClick: () => void;
  delay: number;
}

function RoleCard({
  icon,
  title,
  subtitle,
  description,
  tags,
  accentColor,
  glowColor,
  onClick,
  delay,
}: RoleCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex-1 min-w-0 text-left rounded-2xl p-6 sm:p-8 transition-transform duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      style={{
        background: hovered
          ? "var(--theme-card-bg)"
          : "var(--theme-scene-badge-bg)",
        border: hovered
          ? `1px solid ${accentColor}55`
          : "1px solid var(--theme-card-border)",
        backdropFilter: "blur(20px)",
        boxShadow: hovered
          ? `0 8px 40px ${glowColor}, inset 0 1px 1px rgba(255,255,255,0.06)`
          : "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
        style={{
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}30`,
          color: accentColor,
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <p
        className="text-xs font-medium tracking-widest uppercase mb-2"
        style={{ color: accentColor }}
      >
        {subtitle}
      </p>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 leading-tight">
        {title}
      </h2>

      {/* Description */}
      <p className="text-sm text-[var(--text-subtle)] leading-relaxed mb-6">
        {description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-3 py-1 rounded-full"
            style={{
              background: `${accentColor}12`,
              border: `1px solid ${accentColor}25`,
              color: accentColor,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div
        className="flex items-center gap-2 text-sm font-medium transition-all duration-200"
        style={{ color: accentColor }}
      >
        <span>Get started</span>
        <ArrowRight
          size={16}
          className="transition-transform duration-200"
          style={{ transform: hovered ? "translateX(4px)" : "translateX(0)" }}
        />
      </div>
    </motion.button>
  );
}

export function RoleSelectionLanding({ onSelect }: RoleSelectionLandingProps) {
  return (
    <div
      className="relative w-screen min-h-screen overflow-x-hidden overflow-y-auto flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(30,210,94,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 480,
          height: 480,
          top: "-10%",
          right: "-8%",
          background:
            "radial-gradient(ellipse at center, rgba(30,210,94,0.08) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      {/* Top bar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-6"
      >
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold text-white tracking-tight">
            tr<span style={{ color: "var(--accent)" }}>AI</span>n
          </span>
        </div>
      </motion.header>

      {/* Main content — centered on tall screens, natural flow on short ones */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 sm:px-10 py-10 min-h-0">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="flex items-center gap-1.5 mb-4"
          style={{ color: "var(--accent)" }}
        >
          <SparkleIcon />
          <span className="text-sm font-medium tracking-wide">
            Welcome to trAIn
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22 }}
          className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white text-center mb-3 leading-tight"
        >
          How can we help you today?
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-sm sm:text-base text-[var(--text-subtle)] text-center mb-10 max-w-md"
        >
          Choose your role to get a personalized AI-powered experience
        </motion.p>

        {/* Role card */}
        <div className="flex justify-center w-full max-w-md">
          <RoleCard
            icon={<BriefcaseIcon size={22} />}
            subtitle="Talent"
            title="I'm looking for work"
            description="Find your ideal role, match your skills to jobs, and get AI-driven coaching to close skill gaps."
            tags={["Job Search", "Skill Matching", "Career Coaching"]}
            accentColor="#1ed25e"
            glowColor="rgba(30,210,94,0.12)"
            onClick={onSelect}
            delay={0.38}
          />
        </div>
      </div>

      {/* Bottom hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="relative z-10 text-center text-xs text-[var(--text-subtle)] pb-6 tracking-widest uppercase"
        style={{ letterSpacing: "0.15em" }}
      >
        Powered by AI
      </motion.p>
    </div>
  );
}
