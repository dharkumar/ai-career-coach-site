'use client';

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Lock, Circle, BookOpen, Loader2, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { completeLearning } from "@/lib/mcpBridge";
import { notifyTele } from "@/utils/teleUtils";

interface LearningPathTemplateProps {
  candidateId: string;
  jobTitle?: string;
  onClose: () => void;
}

interface CourseStep {
  label: string;
}

interface Course {
  id: string;
  title: string;
  tag: string;
  tagColor: "missing" | "upgrade";
  skill: string;
  steps: CourseStep[];
}

const COURSES: Course[] = [
  {
    id: "kubernetes",
    title: "Kubernetes Fundamentals",
    tag: "Missing Skill",
    tagColor: "missing",
    skill: "kubernetes",
    steps: [
      { label: "Introduction to Containers & Orchestration" },
      { label: "Core Kubernetes Concepts (Pods, Services, Deployments)" },
      { label: "Hands-on Project: Deploy ML Model on K8s" },
    ],
  },
];

type CompletionState = "idle" | "loading" | "done";

export function LearningPathTemplate({ candidateId, jobTitle, onClose }: LearningPathTemplateProps) {
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
  const [completionState, setCompletionState] = useState<CompletionState>("idle");

  const allDone = completedCourses.size === COURSES.length;

  const course1Done = completedCourses.has("kubernetes");
  const isCourse2Locked = false; // Only 1 course, no locking needed

  const handleMarkComplete = (courseId: string) => {
    setCompletedCourses((prev) => new Set(Array.from(prev).concat(courseId)));
  };

  const handleCompletePath = async () => {
    if (!allDone || completionState !== "idle") return;
    setCompletionState("loading");
    try {
      await completeLearning(candidateId);
      setCompletionState("done");
      void notifyTele("user completed learning path");
    } catch {
      setCompletionState("idle");
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[120] flex flex-col bg-[var(--bg-deep)] no-lightboard"
      style={{ isolation: "isolate" }}
      data-testid="learning-path-template"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 pt-8 pb-4 bg-[var(--bg-deep)] no-lightboard">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-[var(--glass-btn)] flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[var(--text-primary)] text-lg font-semibold leading-6 truncate">
            Learning Path
          </p>
          <p className="text-[var(--text-muted)] text-sm leading-5 truncate">
            {jobTitle ?? "Machine Learning Engineer"} · 1 course
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{
          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
        }}>
          <BookOpen size={13} className="text-[var(--accent)]" />
          <span className="text-[var(--accent)] text-xs font-medium">
            {completedCourses.size}/{COURSES.length} done
          </span>
        </div>
      </div>

      {/* Success state */}
      <AnimatePresence>
        {completionState === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-8 gap-6"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
            >
              <Trophy size={36} className="text-[var(--accent)]" />
            </div>
            <div className="text-center">
              <p className="text-[var(--text-primary)] text-2xl font-bold mb-2">
                Learning Complete!
              </p>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                You've unlocked Kubernetes fundamentals.
                Your AI Architect match score has improved. Check your updated profile.
              </p>
            </div>
            <button
              onClick={onClose}
              className="h-[52px] px-8 bg-[var(--accent)] rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span className="text-[var(--accent-contrast)] text-base font-semibold">View Updated Profile</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course list */}
      {completionState !== "done" && (
        <>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="flex flex-col gap-5">
              {COURSES.map((course, idx) => {
                const isLocked = idx === 1 && isCourse2Locked;
                const isDone = completedCourses.has(course.id);

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: isLocked ? 0.45 : 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "var(--surface-card)",
                      border: isDone
                        ? "1px solid color-mix(in srgb, var(--accent) 35%, transparent)"
                        : "1px solid var(--border-subtle)",
                    }}
                  >
                    {/* Course header */}
                    <div className="px-5 pt-5 pb-4 flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: isDone
                            ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                            : isLocked
                            ? "var(--glass-btn)"
                            : "color-mix(in srgb, var(--fit-stretch) 12%, transparent)",
                        }}
                      >
                        {isDone ? (
                          <CheckCircle2 size={20} className="text-[var(--accent)]" />
                        ) : isLocked ? (
                          <Lock size={18} className="text-[var(--text-muted)]" />
                        ) : (
                          <BookOpen size={18} className="text-[var(--fit-stretch)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-base font-semibold leading-snug">
                          {course.title}
                        </p>
                        <span
                          className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              course.tagColor === "missing"
                                ? "color-mix(in srgb, #ef4444 12%, transparent)"
                                : "color-mix(in srgb, var(--fit-stretch) 12%, transparent)",
                            color:
                              course.tagColor === "missing" ? "#fca5a5" : "var(--fit-stretch-light)",
                          }}
                        >
                          {course.tag}
                        </span>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="px-5 pb-4 flex flex-col gap-2">
                      {course.steps.map((step, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-3">
                          {isDone ? (
                            <CheckCircle2 size={14} className="text-[var(--accent)] shrink-0" />
                          ) : (
                            <Circle size={14} className="text-[var(--text-muted)] shrink-0" />
                          )}
                          <span
                            className="text-sm"
                            style={{
                              color: isDone ? "var(--text-secondary)" : "var(--text-muted)",
                              textDecoration: isDone ? "line-through" : "none",
                            }}
                          >
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Mark Complete button */}
                    {!isDone && !isLocked && (
                      <div className="px-5 pb-5">
                        <button
                          onClick={() => handleMarkComplete(course.id)}
                          className="w-full h-[44px] rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                          style={{
                            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                          }}
                        >
                          <CheckCircle2 size={16} className="text-[var(--accent)]" />
                          <span className="text-[var(--accent)] text-sm font-semibold">
                            Mark Complete
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Locked notice */}
                    {isLocked && (
                      <div className="px-5 pb-5">
                        <p className="text-[var(--text-muted)] text-xs text-center">
                          Complete TensorFlow Fundamentals to unlock
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Complete Learning Path — pinned to bottom */}
          <div className="px-6 pb-[32px] pt-4 bg-[var(--bg-deep)] no-lightboard">
            <button
              data-testid="complete-learning-path-btn"
              onClick={handleCompletePath}
              disabled={!allDone || completionState === "loading"}
              className="w-full h-[56px] rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: allDone
                  ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 90%, #8B5CF6), var(--accent))"
                  : "var(--glass-btn)",
              }}
            >
              {completionState === "loading" ? (
                <Loader2 size={20} className="text-[var(--accent-contrast)] animate-spin" />
              ) : (
                <>
                  <Trophy size={18} className={allDone ? "text-[var(--accent-contrast)]" : "text-[var(--text-muted)]"} />
                  <span
                    className="text-base font-semibold"
                    style={{ color: allDone ? "var(--accent-contrast)" : "var(--text-muted)" }}
                  >
                    {allDone ? "Complete Learning Path" : `Complete the course to unlock`}
                  </span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
