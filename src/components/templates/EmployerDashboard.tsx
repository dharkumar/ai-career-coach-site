'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useTeleSpeech } from "@/hooks/useTeleSpeech";
import { motion, AnimatePresence } from "motion/react";
import { HiringPage } from "./HiringPage";
import { JobPostingTemplate } from "./JobPostingTemplate";
import type { JobPostingResponse } from "@/lib/employerApi";
import type { SidebarJob } from "@/components/employer/JobPostingSidebar";
import {
  Search,
  MapPin,
  Mail,
  GraduationCap,
  Plus,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowUp,
  Loader2,
  Building2,
  Users,
  BookOpen,
  MessageCircle,
  X,
  Pencil,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { invokeGetJobApplicants } from "@/lib/mcpBridge";
import {
  cacheJobApplicantsFromTool,
  getCachedJobApplicants,
} from "@/lib/employerApplicantsCache";
import type {
  ApplicationWithProfileListResponse,
  ApplicationWithProfileResponse,
} from "@/lib/employerApi";

/* ── Post-a-Job wizard types & helpers ───────────────────────────────────── */
interface SkillSet { mustHave: string[]; preferred: string[]; niceToHave: string[] }
interface JobFormData {
  title: string; department: string; location: string; employmentType: string;
  description: string; skills: SkillSet; salaryMin: string; salaryMax: string;
}
interface PostedJob { title: string; department: string; location: string; postedAt: Date }

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Internship"];

function inferDescription(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("ml") || t.includes("machine learning"))
    return `We're looking for a ${title} to design, build, and deploy intelligent systems. You'll work across the full model lifecycle — from data prep and training to evaluation and production rollout.`;
  if (t.includes("backend") || t.includes("back-end") || t.includes("server"))
    return `We're hiring a ${title} to build and maintain scalable APIs and services. You'll collaborate with product and frontend teams to ship reliable, high-performance features.`;
  if (t.includes("frontend") || t.includes("front-end") || t.includes("react developer") || t.includes("ui engineer"))
    return `We're looking for a ${title} to craft fast, polished user experiences. You'll own the UI layer end-to-end — from component design to performance optimisation.`;
  if (t.includes("full stack") || t.includes("fullstack"))
    return `We're hiring a ${title} to take features from database schema to polished UI. You'll be equally comfortable in backend services and React components.`;
  if (t.includes("cloud") || t.includes("devops") || t.includes("sre") || t.includes("platform"))
    return `We need a ${title} to design and manage our infrastructure at scale. You'll own provisioning, security hardening, and cost optimisation across our cloud environments.`;
  if (t.includes("data analyst") || t.includes("business analyst"))
    return `We're looking for a ${title} to turn raw data into actionable insights. You'll partner with business teams to define metrics, build dashboards, and surface trends that drive decisions.`;
  if (t.includes("data engineer") || t.includes("etl"))
    return `We need a ${title} to build and maintain the pipelines that power our analytics platform. You'll ensure data is clean, reliable, and accessible at scale.`;
  if (t.includes("product manager") || t.includes("product owner"))
    return `We're hiring a ${title} to own the roadmap for one of our core product areas. You'll translate user needs and business goals into clear, prioritised specs for engineering.`;
  if (t.includes("sales") || t.includes("account executive") || t.includes("business development"))
    return `We're looking for a ${title} to drive revenue growth and own key accounts. You'll build relationships, run discovery calls, and close deals against quarterly targets.`;
  return `We're hiring a ${title} to join our growing team. You'll contribute meaningfully from day one and work alongside talented colleagues to deliver real impact.`;
}

function inferSkills(title: string): SkillSet {
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("ml") || t.includes("machine learning"))
    return { mustHave: ["Python", "PyTorch or TensorFlow", "Scikit-learn", "Model evaluation"], preferred: ["MLflow", "SQL / data pipelines", "Docker"], niceToHave: ["LLM fine-tuning", "Kaggle", "Open-source contributions"] };
  if (t.includes("backend") || t.includes("back-end") || t.includes("server"))
    return { mustHave: ["Node.js or Python", "REST API design", "PostgreSQL / MySQL", "Git & CI/CD"], preferred: ["Redis", "Microservices", "Docker"], niceToHave: ["GraphQL", "Kafka / RabbitMQ", "AWS / GCP"] };
  if (t.includes("frontend") || t.includes("front-end") || t.includes("react developer") || t.includes("ui engineer"))
    return { mustHave: ["React / Next.js", "TypeScript", "CSS / Tailwind", "REST integration"], preferred: ["Zustand / Redux", "Vitest / Jest", "Figma handoff"], niceToHave: ["Framer Motion", "Web accessibility", "React Native"] };
  if (t.includes("full stack") || t.includes("fullstack"))
    return { mustHave: ["React / Next.js", "Node.js or Python", "PostgreSQL", "Git & CI/CD"], preferred: ["TypeScript", "Docker", "REST API design"], niceToHave: ["AWS / GCP", "React Native", "DevOps basics"] };
  if (t.includes("cloud") || t.includes("devops") || t.includes("sre") || t.includes("platform"))
    return { mustHave: ["AWS / Azure / GCP", "Terraform", "Linux & networking", "IAM & security"], preferred: ["Kubernetes", "CI/CD pipelines", "Datadog / CloudWatch"], niceToHave: ["FinOps", "Multi-cloud", "AWS / CKA certifications"] };
  if (t.includes("data analyst") || t.includes("business analyst"))
    return { mustHave: ["SQL", "Excel / Google Sheets", "Tableau / Power BI", "Statistical thinking"], preferred: ["Python (Pandas)", "Looker / Metabase", "A/B testing"], niceToHave: ["dbt", "Google Analytics", "Storytelling"] };
  if (t.includes("data engineer") || t.includes("etl"))
    return { mustHave: ["Python", "SQL", "Spark or dbt", "BigQuery / Redshift / Snowflake"], preferred: ["Airflow / Prefect", "Kafka / Kinesis", "Docker"], niceToHave: ["Real-time streaming", "DataOps", "Feature stores"] };
  if (t.includes("product manager") || t.includes("product owner"))
    return { mustHave: ["Product roadmapping", "User story writing", "Stakeholder comms", "Data-driven decisions"], preferred: ["SQL basics", "Figma / wireframing", "Agile / Scrum"], niceToHave: ["Technical background", "A/B testing", "OKR frameworks"] };
  if (t.includes("sales") || t.includes("account executive") || t.includes("business development"))
    return { mustHave: ["B2B sales", "CRM (Salesforce / HubSpot)", "Pipeline management", "Negotiation"], preferred: ["SaaS sales motion", "Account-based selling", "Forecasting"], niceToHave: ["Arabic fluency", "Team leadership", "Channel / partner sales"] };
  return { mustHave: ["Relevant technical skills", "Communication", "Problem solving"], preferred: ["Domain experience", "Team collaboration"], niceToHave: ["Industry certifications", "Mentoring ability"] };
}

function getMarketSalary(title: string): { label: string; min: number; max: number } {
  const t = title.toLowerCase();
  if (t.includes("senior") && (t.includes("ai") || t.includes("ml"))) return { label: "SAR 55K–75K", min: 55000, max: 75000 };
  if (t.includes("ai") || t.includes("ml")) return { label: "SAR 35K–55K", min: 35000, max: 55000 };
  if (t.includes("senior")) return { label: "SAR 45K–65K", min: 45000, max: 65000 };
  if (t.includes("cloud") || t.includes("devops")) return { label: "SAR 40K–60K", min: 40000, max: 60000 };
  return { label: "SAR 30K–50K", min: 30000, max: 50000 };
}

const TOTAL_STEPS = 5;

/* ── Post-a-Job Wizard ───────────────────────────────────────────────────── */
function PostJobWizardCard({ onClose, onFinish, initialData }: {
  onClose: () => void;
  onFinish: (formData: JobFormData) => void;
  initialData?: Partial<JobFormData>;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<JobFormData>({
    title: initialData?.title || "",
    department: initialData?.department || "",
    location: initialData?.location || "",
    employmentType: initialData?.employmentType || "",
    description: initialData?.description || "",
    skills: initialData?.skills || { mustHave: [], preferred: [], niceToHave: [] },
    salaryMin: initialData?.salaryMin || "",
    salaryMax: initialData?.salaryMax || "",
  });
  const [addingSkillTier, setAddingSkillTier] = useState<keyof SkillSet | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const set = (k: keyof JobFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const goNext = () => {
    // When advancing from step 1, silently apply inferred description & skills for empty fields
    if (step === 1 && form.title.trim()) {
      setForm(f => ({
        ...f,
        description: f.description || inferDescription(f.title),
        skills: {
          mustHave: f.skills.mustHave.length ? f.skills.mustHave : inferSkills(f.title).mustHave,
          preferred: f.skills.preferred.length ? f.skills.preferred : inferSkills(f.title).preferred,
          niceToHave: f.skills.niceToHave.length ? f.skills.niceToHave : inferSkills(f.title).niceToHave,
        },
      }));
    }
    setStep(s => s + 1);
  };
  const goBack = () => setStep(s => s - 1);

  const removeSkill = (skill: string, tier: keyof SkillSet) => {
    setForm(f => ({ ...f, skills: { ...f.skills, [tier]: f.skills[tier].filter(s => s !== skill) } }));
  };

  const addSkill = (tier: keyof SkillSet) => {
    const s = newSkill.trim();
    if (!s) return;
    setForm(f => ({ ...f, skills: { ...f.skills, [tier]: [...f.skills[tier], s] } }));
    setNewSkill(""); setAddingSkillTier(null);
  };

  const market = getMarketSalary(form.title);
  const salaryMinNum = parseInt(form.salaryMin.replace(/\D/g, "")) || 0;
  const salaryMaxNum = parseInt(form.salaryMax.replace(/\D/g, "")) || 0;
  const belowMarket = (salaryMaxNum > 0 && salaryMaxNum < market.min) || (salaryMinNum > 0 && salaryMinNum < market.min * 0.7);

  const handleFinish = () => {
    setSending(true);
    setSendError(null);
    onFinish(form);
    setSending(false);
  };

  const tierLabels: { key: keyof SkillSet; label: string; color: string }[] = [
    { key: "mustHave", label: "MUST-HAVE", color: "#1ed25e" },
    { key: "preferred", label: "PREFERRED", color: "#51a2ff" },
    { key: "niceToHave", label: "NICE-TO-HAVE", color: "#a78bfa" },
  ];

  const step1Valid = form.title.trim().length > 0;

  return (
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--surface-modal)", border: "1px solid var(--border-soft)", maxHeight: "calc(100vh - 180px)" }}
      >
        {/* Title row */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-semibold text-white">Post a job</span>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={16} /></button>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all duration-400"
                style={{ background: i < step ? "var(--accent)" : "var(--border-soft)" }} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-5">
          <AnimatePresence mode="wait">
            {/* ── Step 1: Role details ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-5">
                <p className="text-sm text-white/50">Let's start with the basics. What role are you hiring for?</p>
                <div>
                  <p className="text-sm font-semibold text-white mb-3">Role details</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Title", key: "title" as const, placeholder: "Eg. Senior Engineer" },
                      { label: "Department", key: "department" as const, placeholder: "Eg. Engineering" },
                      { label: "Location", key: "location" as const, placeholder: "Eg. Riyadh" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} className={key === "title" ? "col-span-2 sm:col-span-1" : ""}>
                        <label className="block text-xs text-white/45 mb-1.5">{label}</label>
                        <input
                          value={form[key] as string}
                          onChange={e => set(key, e.target.value)}
                          placeholder={placeholder}
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none focus:border-white/25 transition-colors"
                          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-soft)" }}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-white/45 mb-1.5">Employment Type</label>
                      <div className="relative">
                        <select
                          value={form.employmentType}
                          onChange={e => set("employmentType", e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none appearance-none transition-colors"
                          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-soft)", color: form.employmentType ? "white" : "var(--text-placeholder)" }}
                        >
                          <option value="" disabled>Eg. Full Time</option>
                          {EMPLOYMENT_TYPES.map(t => <option key={t} value={t} style={{ background: "var(--surface-card)" }}>{t}</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Job description ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3">
                <p className="text-sm text-white/50">I've generated a job description for you. You may edit this.</p>
                <textarea
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white/85 outline-none resize-none leading-relaxed"
                  style={{ background: "var(--surface-dim)", border: "1px solid var(--border-soft)" }}
                />
              </motion.div>
            )}

            {/* ── Step 3: Skills ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3">
                <p className="text-sm text-white/50">AI has categorized skill requirements. Drag skills between tiers or edit.</p>
                <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: "var(--surface-dim)", border: "1px solid var(--surface-hover)" }}>
                  {tierLabels.map(({ key, label, color }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="text-[10px] font-semibold tracking-wider" style={{ color }}>{label}</span>
                        </div>
                        {addingSkillTier !== key && (
                          <button onClick={() => setAddingSkillTier(key)}
                            className="flex items-center gap-1 text-[10px] text-white/35 hover:text-white/65 transition-colors">
                            <Plus size={10} /> Add
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {form.skills[key].map(skill => (
                          <div key={skill} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/80"
                            style={{ background: "var(--surface-faint)", border: "1px solid var(--glass-btn-border)" }}>
                            <span>{skill}</span>
                            <button onClick={() => removeSkill(skill, key)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {addingSkillTier === key ? (
                          <div className="flex items-center gap-1.5">
                            <input autoFocus value={newSkill} onChange={e => setNewSkill(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") addSkill(key); if (e.key === "Escape") { setAddingSkillTier(null); setNewSkill(""); } }}
                              className="px-3 py-1.5 rounded-full text-xs text-white outline-none w-28"
                              style={{ background: "var(--surface-hover)", border: `1px solid ${color}60` }}
                              placeholder="Skill name" />
                            <button onClick={() => addSkill(key)} className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: color, color: "var(--accent-contrast)" }}>Add</button>
                            <button onClick={() => { setAddingSkillTier(null); setNewSkill(""); }} className="text-white/30 hover:text-white/60 transition-colors">
                              <X size={12} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Salary ── */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3">
                <p className="text-sm text-white/50">Set the salary range. I'll check it against market data.</p>
                <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: "var(--surface-dim)", border: "1px solid var(--surface-hover)" }}>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Lower Boundary", key: "salaryMin" as const, placeholder: "SAR 1,000" },
                      { label: "Upper Boundary", key: "salaryMax" as const, placeholder: "SAR 5,000" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs text-white/45 mb-1.5">{label}</label>
                        <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                          style={{ background: "var(--surface-subtle)", border: "1px solid var(--border-soft)" }} />
                      </div>
                    ))}
                  </div>
                  {belowMarket && (
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "var(--error-surface-subtle)", border: "1px solid var(--error-border-subtle)" }}>
                      <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300 leading-relaxed">
                        Below market: {form.title || "this role"} median is {market.label}. This may reduce your candidate pool by ~40%.
                      </p>
                    </div>
                  )}
                  {!belowMarket && (form.salaryMin || form.salaryMax) && (
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "var(--accent-surface-subtle)", border: "1px solid var(--accent-border-subtle)" }}>
                      <span className="text-xs" style={{ color: "var(--accent)" }}>✓</span>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--accent)" }}>Competitive range. Market benchmark: {market.label}.</p>
                    </div>
                  )}
                  <p className="text-[11px] text-white/30">Market benchmark for {form.title || "this role"}: {market.label}</p>
                </div>
              </motion.div>
            )}

            {/* ── Step 5: Preview ── */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3">
                <p className="text-sm text-white/50">Here's the full description people will see.</p>
                <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--surface-dim)", border: "1px solid var(--surface-hover)" }}>
                  <p className="text-sm font-semibold text-white">{form.title || "Untitled role"}</p>
                  <p className="text-xs text-white/40">
                    {[form.department, form.location, form.salaryMin && form.salaryMax ? `SAR ${form.salaryMin} – ${form.salaryMax}` : market.label].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm text-white/70 leading-relaxed mt-1">{form.description}</p>
                  {tierLabels.map(({ key, label, color }) =>
                    form.skills[key].length > 0 ? (
                      <div key={key} className="mt-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {form.skills[key].map(s => (
                            <span key={s} className="px-2.5 py-1 rounded-full text-xs text-white/70"
                              style={{ background: "var(--surface-faint)", border: "1px solid var(--border-soft)" }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save error */}
          {sendError && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl flex-shrink-0"
              style={{ background: "var(--error-surface-subtle)", border: "1px solid var(--error-border-subtle)" }}>
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">{sendError}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-auto pt-2 flex-shrink-0">
            {step > 1 ? (
              <button onClick={goBack} disabled={sending}
                className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
                <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} /> Back
              </button>
            ) : <div />}
            <button
              onClick={step === TOTAL_STEPS ? handleFinish : goNext}
              disabled={(step === 1 && !step1Valid) || sending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all"
              style={{ background: ((step === 1 && !step1Valid) || sending) ? "rgba(30,210,94,0.4)" : "var(--accent)" }}>
              {step === TOTAL_STEPS
                ? sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : "Finish"
                : <>"Continue" <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
  );
}

interface EmployerDashboardProps {
  onBack?: () => void;
}

type NavTab = "home" | "hiring" | "workforce";

/* ── Review-applicants UI data types ─────────────────────────────────────── */
interface CandidateCard {
  id: string;
  name: string;
  title: string;
  location: string;
  experienceYears: number;
  matchScore: number;
  skills: string[];
}

interface ApplicantsViewData {
  jobTitle: string;
  jobMeta: string;
  jobId: string;
  totalApplicants: number;
  closeMatchCount: number;
  recommended: CandidateCard[];
  suggestions: CandidateCard[];
}

interface CandidateDetailData {
  id: string;
  name: string;
  title: string;
  location: string;
  experienceYears: number;
  matchScore: number;
  skills: string[];
  jobTitle: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  type?: "text" | "job-posted" | "applicants-view" | "candidate-detail";
  job?: PostedJob;
  options?: string[];
  jobCard?: {
    title: string;
    location: string;
    description: string;
    skills: string[];
    mustHave: string[];
    preferred: string[];
    niceToHave: string[];
  };
  applicantsView?: ApplicantsViewData;
  candidateDetail?: CandidateDetailData;
}

/* ── Options parsed from the loaded prompt markdown ──────────────────────── */
interface PromptStepOptions {
  step1: string[];
  step2: string[];
  step3: string[];
}

/* ── Mobeus helpers ──────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fw = () => (window as any).UIFramework as Record<string, unknown> | undefined;

/** Loads agent-knowledge.md and returns only the EMPLOYER FLOW section (single source of truth). */
async function loadEmployerPrompt(): Promise<string> {
  const res = await fetch("/prompts/agent-knowledge.md");
  if (!res.ok) throw new Error("Failed to load agent-knowledge.md");
  const full = await res.text();
  const start = full.indexOf("## EMPLOYER FLOW");
  if (start === -1) return full;
  return full.slice(start).trim();
}

/**
 * Connects the Mobeus LLM session for EMPLOYER TEXT CHAT (audio-silent).
 *
 * Critical ordering:
 *  1. updateVoicePrompt(employer) BEFORE connectAll — the SDK stores this and
 *     uses it when initialising the OpenAI Realtime session, overriding the
 *     default talent prompt from the admin panel. Calling it AFTER connect is
 *     ignored because the session is already initialised with the talent prompt.
 *  2. Mute + block mic BEFORE connectAll so no audio plays during init.
 *  3. connectAll() starts the LLM with the employer prompt already applied.
 *  4. interruptAvatarSpeech() + mute sweep stop any residual audio output.
 *  5. Suppress all visual SDK layers (background, voice widget, inversion).
 *  useTeleSpeech captures the AI's text via the LiveKit data channel so the
 *  avatar stays connected (required for the data channel) while fully muted.
 */
async function startChatSession(systemPrompt: string): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if ((window as unknown as Record<string, unknown>).UIFramework) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  const framework = fw();
  if (!framework) throw new Error("UIFramework not available");

  // ── Step 1: set employer prompt BEFORE connecting ────────────────────────
  // The SDK stores this and passes it to OpenAI session.update on init.
  if (typeof framework.updateVoicePrompt === "function")
    (framework.updateVoicePrompt as (p: string) => void)(systemPrompt);

  // ── Step 2: pre-mute everything before the session opens ─────────────────
  if (typeof framework.setAvatarVolume === "function")
    (framework.setAvatarVolume as (v: number) => void)(0);
  if (typeof framework.setAvatarVideoMuted === "function")
    (framework.setAvatarVideoMuted as (v: boolean) => void)(true);
  if (typeof framework.setVoiceChatVisibility === "function")
    (framework.setVoiceChatVisibility as (v: boolean) => void)(false);
  if (typeof framework.updateConfig === "function")
    (framework.updateConfig as (c: object) => void)({ muteByDefault: true, voiceUIVisible: false });
  document.querySelectorAll("audio, video").forEach((el) => {
    (el as HTMLMediaElement).muted = true;
    (el as HTMLMediaElement).volume = 0;
  });

  // ── Step 3: connect ───────────────────────────────────────────────────────
  // __employerMode is set to true by the component on mount (before this
  // function is called) and stays true for the entire employer session.
  // The getUserMedia intercept in index.html returns a silent stream whenever
  // __employerMode is true, including any async LiveKit track setup that
  // happens after connectAll() resolves.
  if (typeof framework.connectAll === "function")
    await (framework.connectAll as () => Promise<void>)();
  else if (typeof framework.connectOpenAI === "function")
    await (framework.connectOpenAI as () => Promise<void>)();

  // ── Step 4: mute DOM media injected during connect ─────────────────────
  // SDK-level mute is handled once by startMuteLoop(); here we only sweep
  // <audio>/<video> elements the SDK may have added during connectAll().
  document.querySelectorAll("audio, video").forEach((el) => {
    (el as HTMLMediaElement).muted = true;
    (el as HTMLMediaElement).volume = 0;
  });

  // ── Step 5: suppress visual SDK layers ───────────────────────────────────
  if (typeof framework.hideBgLayer === "function")
    (framework.hideBgLayer as () => void)();
  if (typeof framework.deactivateVisualInversion === "function")
    (framework.deactivateVisualInversion as () => void)();

  // Wait for teleAcknowledge (polls 200 ms, up to 10 s)
  for (let i = 0; i < 50; i++) {
    if (typeof fw()?.teleAcknowledge === "function") break;
    await new Promise((r) => setTimeout(r, 200));
  }
}

/**
 * Suppresses avatar audio for the employer session.
 * SDK API calls fire ONCE up-front.  The MutationObserver only mutes newly
 * injected <audio>/<video> DOM elements — it never re-calls the SDK API, so
 * the UIFramework won't log on every tick.
 * Does NOT call interruptAvatarSpeech() — that would cut off the avatar's
 * speech before useTeleSpeech can capture the full text via the data channel.
 */
function startMuteLoop(): () => void {
  const framework = fw();
  if (framework) {
    if (typeof framework.setAvatarVolume === "function")
      (framework.setAvatarVolume as (v: number) => void)(0);
    if (typeof framework.setAvatarVideoMuted === "function")
      (framework.setAvatarVideoMuted as (v: boolean) => void)(true);
    if (typeof framework.updateConfig === "function")
      (framework.updateConfig as (c: object) => void)({ muteByDefault: true });
  }

  document.querySelectorAll("audio, video").forEach((el) => {
    (el as HTMLMediaElement).muted = true;
    (el as HTMLMediaElement).volume = 0;
  });

  const obs = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLMediaElement) {
          node.muted = true;
          node.volume = 0;
        } else if (node instanceof HTMLElement) {
          node.querySelectorAll("audio, video").forEach((el) => {
            (el as HTMLMediaElement).muted = true;
            (el as HTMLMediaElement).volume = 0;
          });
        }
      });
    }
  });
  obs.observe(document.body, { subtree: true, childList: true });
  return () => { obs.disconnect(); };
}

/** Sends a visible user message to the AI. */
function sendChatText(text: string) {
  const framework = fw();
  if (!framework) return;
  if (typeof framework.TellTele === "function")
    (framework.TellTele as (t: string) => void)(text);
}


/* ── Option / job-data parsing ───────────────────────────────────────────── */

/** Strips [OPTIONS: ...] from text (with or without backticks) and returns the cleaned text + option list. */
function parseInlineOptions(text: string): { displayText: string; options: string[] } {
  const match = text.match(/`?\[OPTIONS:\s*([^\]]+)\]\s*`?/i);
  if (!match) return { displayText: text, options: [] };
  const options = match[1].split("|").map((s) => s.trim()).filter(Boolean);
  const displayText = text.replace(/`?\[OPTIONS:[^\]]*\]\s*`?/gi, "").trim();
  return { displayText, options };
}

/**
 * Reads every Step N block from the prompt and extracts the [OPTIONS: ...] list.
 * No option values are hardcoded here — they come from the file.
 */
function extractOptionsFromPrompt(promptText: string): PromptStepOptions {
  const getStepOptions = (stepNum: number): string[] => {
    const pattern = new RegExp(
      `\\*\\*Step\\s+${stepNum}[^*]*\\*\\*[\\s\\S]{0,600}?\\[OPTIONS:\\s*([^\\]]+)\\]`,
      "i"
    );
    const match = promptText.match(pattern);
    if (!match) return [];
    return match[1].split("|").map((s) => s.trim()).filter(Boolean);
  };
  return { step1: getStepOptions(1), step2: getStepOptions(2), step3: getStepOptions(3) };
}

/**
 * When the SDK strips [OPTIONS: ...] from the AI reply, fall back to matching
 * the question text against known patterns and return the prompt-sourced options.
 */
function resolveFallbackOptions(text: string, opts: PromptStepOptions): string[] {
  // Matches: "what role are you hiring for", "what role are you looking to hire",
  //          "what role are you looking for", "which role are you hiring", etc.
  if (/what role|which role|role are you (hiring|looking)|role.*hire for/i.test(text)) return opts.step1;
  if (/experience level are you looking|what experience level|experience level.*looking/i.test(text)) return opts.step2;
  // Matches: "Where is this role based?", "Where is this Senior Backend Developer role based?"
  if (/where is this .* role based|where is this role based|role based\?/i.test(text)) return opts.step3;
  return [];
}

/** Returns which job field the AI is currently asking for. */
function resolveCurrentStep(text: string): "role" | "experience" | "location" | null {
  if (/what role|which role|role are you (hiring|looking)|role.*hire for/i.test(text)) return "role";
  if (/experience level are you looking|what experience level|experience level.*looking/i.test(text)) return "experience";
  if (/where is this .* role based|where is this role based|role based\?/i.test(text)) return "location";
  return null;
}

/** Follow-up chips after applicant list — from trainco_employer.md (not per-candidate names). */
/** Fallback chips if the model omits `[OPTIONS: ...]` after VIEW_APPLICANTS (same labels as trainco_employer.md). */
const REVIEW_APPLICANTS_FOLLOW_UP_OPTIONS = [
  "Detailed analysis",
  "Help creating a shortlist",
  "Something else",
];

/**
 * Parses [VIEW_APPLICANTS: job_title="..." posting_id="job_xxx"] — posting_id required (keys Mobeus cacheJobApplicants data).
 */
function parseViewApplicants(text: string): {
  displayText: string;
  jobTitle: string | null;
  postingId: string | null;
} {
  const block = text.match(/`?\[VIEW_APPLICANTS:\s*([^\]]+)\]\s*`?/i);
  if (!block) return { displayText: text, jobTitle: null, postingId: null };
  const inner = block[1].trim();
  const jtQuoted = inner.match(/job_title\s*=\s*"([^"]*)"/i);
  const jtUnquoted = inner.match(/job_title\s*=\s*([^\s|]+)/i);
  const jobTitle = (jtQuoted?.[1] ?? jtUnquoted?.[1])?.trim() ?? null;
  const pidQuoted = inner.match(/posting_id\s*=\s*"([^"]*)"/i);
  const pidUnquoted = inner.match(/posting_id\s*=\s*([^\s\]]+)/i);
  const postingId = (pidQuoted?.[1] ?? pidUnquoted?.[1])?.trim() || null;
  const displayText = text.replace(/`?\[VIEW_APPLICANTS:[^\]]*\]`?/gi, "").trim();
  return { displayText, jobTitle, postingId };
}

/**
 * Parses [CANDIDATE_DETAIL: candidate_name="..." posting_id="..."] — posting_id optional.
 */
function parseCandidateDetail(text: string): {
  displayText: string;
  candidateName: string | null;
  postingId: string | null;
} {
  const block = text.match(/`?\[CANDIDATE_DETAIL:\s*([^\]]+)\]\s*`?/i);
  if (!block) return { displayText: text, candidateName: null, postingId: null };
  const inner = block[1].trim();
  const cnQuoted = inner.match(/candidate_name\s*=\s*"([^"]*)"/i);
  const cnUnquoted = inner.match(/candidate_name\s*=\s*([^\s|]+)/i);
  const candidateName = (cnQuoted?.[1] ?? cnUnquoted?.[1])?.trim() ?? null;
  const pidQuoted = inner.match(/posting_id\s*=\s*"([^"]*)"/i);
  const pidUnquoted = inner.match(/posting_id\s*=\s*([^\s\]]+)/i);
  const postingId = (pidQuoted?.[1] ?? pidUnquoted?.[1])?.trim() || null;
  const displayText = text.replace(/`?\[CANDIDATE_DETAIL:[^\]]*\]`?/gi, "").trim();
  return { displayText, candidateName, postingId };
}

function statusToMatchScore(status: string): number {
  if (status === "shortlisted") return 92;
  if (status === "reviewing") return 85;
  return 74;
}

function applicationToCandidateCard(
  a: ApplicationWithProfileResponse,
  fallbackJobTitle: string,
): CandidateCard {
  const p = a.candidate_profile as Record<string, unknown> | null | undefined;
  let experienceYears = 3;
  if (p && typeof p.experience_years === "number") experienceYears = p.experience_years;
  else if (p && Array.isArray(p.experience) && p.experience.length > 0) {
    const ex0 = p.experience[0] as { years?: number };
    if (typeof ex0?.years === "number") experienceYears = ex0.years;
  }
  const skills: string[] = [];
  if (p && Array.isArray(p.skills)) {
    for (const s of p.skills as { name?: string }[]) {
      if (s?.name) skills.push(s.name);
    }
  }
  let title = fallbackJobTitle;
  if (p && Array.isArray(p.experience) && p.experience.length > 0) {
    const ex0 = p.experience[0] as { title?: string };
    if (ex0?.title) title = ex0.title;
  }
  let location = "—";
  if (p?.city) location = String(p.city);
  else if (p?.location) location = String(p.location);

  return {
    id: a.candidate_id,
    name: a.candidate_name ?? "Candidate",
    title,
    location,
    experienceYears,
    matchScore: statusToMatchScore(a.status),
    skills: skills.slice(0, 12),
  };
}

function buildApplicantsViewData(
  postingId: string,
  jobTitle: string,
  jobMeta: string,
  res: ApplicationWithProfileListResponse,
): ApplicantsViewData {
  const items = res.items;
  let recommended = items
    .filter((x) => x.status === "shortlisted" || x.status === "reviewing")
    .map((x) => applicationToCandidateCard(x, jobTitle));
  let suggestions = items
    .filter((x) => x.status === "applied")
    .map((x) => applicationToCandidateCard(x, jobTitle));
  if (recommended.length === 0 && suggestions.length === 0 && items.length > 0) {
    recommended = items.map((x) => applicationToCandidateCard(x, jobTitle));
  }
  const shortlisted = items.filter(
    (x) => x.status === "shortlisted" || x.status === "reviewing",
  ).length;
  const closeMatchCount = shortlisted > 0 ? shortlisted : Math.min(3, items.length);

  return {
    jobTitle,
    jobMeta: jobMeta || `${items.length} applicants`,
    jobId: postingId,
    totalApplicants: res.total,
    closeMatchCount,
    recommended,
    suggestions,
  };
}

/** Strips year-range suffixes like "(0–2 yrs)" or "(5+ yrs)" from a title. */
function cleanTitle(t: string): string {
  return t.replace(/\s*\(\d+[–\-+]?\d*\s*yrs?\)/gi, "").replace(/\s+/g, " ").trim();
}

/**
 * Parses a [JOB_DATA: ...] marker emitted by the AI.
 * Handles both quoted (key="value") and unquoted (key=value) formats.
 * Returns null if the marker is absent or the title is an unfilled placeholder.
 */
function parseJobData(text: string): {
  displayText: string;
  jobCard: NonNullable<ChatMessage["jobCard"]> | null;
} {
  const match = text.match(/`?\[JOB_DATA:\s*([\s\S]*?)\]`?/i);
  if (!match) return { displayText: text, jobCard: null };

  // Strip the marker and clean up any orphaned wrapping characters the AI
  // may have added around it (parentheses, backticks, stray brackets).
  const displayText = text
    .replace(/`?\[JOB_DATA:[\s\S]*?\]`?/gi, "")
    .replace(/[\s([{]*$/, "")   // trailing orphaned open-brackets / whitespace
    .replace(/[)\]}`]+$/, "")   // trailing orphaned close-brackets
    .trim();
  const raw = match[1];
  const get = (key: string) => {
    const quoted = raw.match(new RegExp(`${key}="([^"]*)"`, "i"));
    if (quoted) return quoted[1].trim();
    const unquoted = raw.match(new RegExp(`${key}=([^|\\]]+)`, "i"));
    return unquoted ? unquoted[1].trim() : "";
  };
  const parseList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const title = cleanTitle(get("title"));
  if (!title || /^\[|seniority|role name/i.test(title)) return { displayText: text, jobCard: null };

  const location = get("location") || "Remote";
  const description = get("description");
  const mustHave = parseList(get("must_have"));
  const preferred = parseList(get("preferred"));
  const niceToHave = parseList(get("nice_to_have"));

  return {
    displayText,
    jobCard: { title, location, description, skills: mustHave.slice(0, 3), mustHave, preferred, niceToHave },
  };
}

/* ── Sidebar icons ───────────────────────────────────────────────────────── */
const sidebarIcons = [
  { icon: Search, label: "Search" },
  { icon: MapPin, label: "Locations" },
  { icon: Mail, label: "Messages" },
  { icon: GraduationCap, label: "Training" },
  { icon: Plus, label: "New" },
];

/* ── Sparkle icon ────────────────────────────────────────────────────────── */
const SparkleIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1.5 L13.6 6.8 L19 8 L13.6 9.2 L12 14.5 L10.4 9.2 L5 8 L10.4 6.8 Z" />
    <path d="M5 15 L5.9 17.6 L8.5 18.5 L5.9 19.4 L5 22 L4.1 19.4 L1.5 18.5 L4.1 17.6 Z" opacity="0.7" />
    <path d="M19 12.5 L19.7 14.6 L21.8 15.3 L19.7 16 L19 18.1 L18.3 16 L16.2 15.3 L18.3 14.6 Z" opacity="0.5" />
  </svg>
);


/* ── Action card ─────────────────────────────────────────────────────────── */
function ActionCard({ icon, label, color, onClick }: {
  icon: React.ReactNode; label: string; color: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-left flex-1 min-w-0"
      style={{
        background: hovered ? "var(--surface-hover)" : "var(--surface-elevated)",
        border: hovered ? `1px solid ${color}30` : "1px solid var(--border-faint)",
        backdropFilter: "blur(12px)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span style={{
          color,
          background: `${color}18`,
          borderRadius: 8,
          padding: "5px 6px",
          display: "flex",
          alignItems: "center",
        }} className="flex-shrink-0">{icon}</span>
        <span className="text-sm font-medium text-white truncate">{label}</span>
      </div>
      <ArrowRight size={13} className="flex-shrink-0 text-white/25" />
    </button>
  );
}

/* ── Suggestion chip ─────────────────────────────────────────────────────── */
function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white/90 transition-all duration-200 flex-shrink-0"
      style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border-soft)",
      }}
    >
      {label}
    </button>
  );
}

/* ── Hiring tab with sub-navigation ──────────────────────────────────────── */
interface SelectedJob {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  posted_at?: string;
}

function toRelativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)       return "just now";
  if (diff < 3600)     return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800)   return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000)  return `${Math.floor(diff / 604800)}w`;
  return `${Math.floor(diff / 2592000)}mo`;
}

function toSidebarJobs(apiJobs: JobPostingResponse[]): SidebarJob[] {
  return apiJobs.map((j) => ({
    id: j.id,
    title: j.title,
    department: j.department || undefined,
    location: j.location || undefined,
    postedAt: toRelativeDate(j.created_at),
    status: j.status,
  }));
}

function HiringTabContent() {
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);
  const [apiJobs, setApiJobs] = useState<JobPostingResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setJobsLoading(true);
    fetch("/api/invoke/list_job_postings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 50, offset: 0 }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`list_job_postings failed (${r.status})`);
        return r.json();
      })
      .then((data) => { if (!cancelled) setApiJobs(data.items ?? []); })
      .catch((e: unknown) => console.error("[HiringTabContent] fetch jobs:", e))
      .finally(() => { if (!cancelled) setJobsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const sidebarJobs = toSidebarJobs(apiJobs);

  const handleSelectJob = useCallback(
    (id: string, job: { title: string; department: string; location: string; status: string; posted_at?: string }) => {
      setSelectedJob({ id, ...job });
    },
    [],
  );

  const handleBackToHiring = useCallback(() => {
    setSelectedJob(null);
  }, []);

  if (selectedJob) {
    return (
      <JobPostingTemplate
        jobPosting={selectedJob}
        postingId={selectedJob.id}
        onNavigateToHiring={handleBackToHiring}
        jobs={sidebarJobs}
        onSelectJob={(id, job) => {
          setSelectedJob({
            id,
            title: job.title,
            department: job.department || "",
            location: job.location || "",
            status: job.status,
            posted_at: job.postedAt,
          });
        }}
      />
    );
  }

  return <HiringPage onSelectJob={handleSelectJob} apiJobs={apiJobs} apiJobsLoading={jobsLoading} />;
}

function WorkforceTabContent() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
        style={{ background: "var(--fit-grow-surface)", border: "1px solid var(--fit-grow-border)" }}>
        <BookOpen size={28} className="text-[var(--fit-grow)]" />
      </div>
      <h3 className="text-lg font-semibold text-white">Workforce Development</h3>
      <p className="text-sm text-[var(--text-subtle)] text-center max-w-xs">
        Track training programs, skill coverage, and employee development across your organisation.
      </p>
      <button className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
        style={{ background: "var(--fit-grow-surface-strong)", border: "1px solid var(--fit-grow-border-strong)" }}>
        View training programs
      </button>
    </div>
  );
}

/* ── Candidate avatar (initials) ─────────────────────────────────────────── */
const AVATAR_COLORS = ["#1a3a5c", "#1a5c3a", "#3a1a5c", "#5c3a1a", "#1a4a5c", "#4a1a5c"];
function CandidateAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const bg = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      className="rounded-xl flex items-center justify-center font-semibold text-white flex-shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.3) }}
    >
      {initials}
    </div>
  );
}

/* ── Circular match-score badge ──────────────────────────────────────────── */
function ScoreCircle({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 85 ? "#1ed25e" : score >= 70 ? "#51a2ff" : "#f97316";
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 42, height: 42 }}>
      <svg width="42" height="42" viewBox="0 0 42 42" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="21" cy="21" r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute font-bold text-white" style={{ fontSize: 11, color }}>{score}</span>
    </div>
  );
}

/* ── Single applicant card ───────────────────────────────────────────────── */
function ApplicantCardTile({ c, onSelect }: { c: CandidateCard; onSelect: (c: CandidateCard) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onSelect(c)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col gap-2.5 p-3 rounded-xl transition-all duration-150 text-left w-full"
      style={{
        background: hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <div className="flex items-start gap-2">
        <CandidateAvatar name={c.name} size={34} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white leading-snug truncate">{c.name}</p>
          <p className="text-[11px] text-white/50 mt-0.5 leading-snug truncate">{c.title}</p>
        </div>
        <ScoreCircle score={c.matchScore} />
      </div>
      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <span className="flex items-center gap-0.5"><MapPin size={8} />{c.location}</span>
        <span className="flex items-center gap-0.5">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="opacity-60">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          </svg>
          {c.experienceYears} yrs
        </span>
      </div>
    </button>
  );
}

/* ── Paginated applicant carousel section ────────────────────────────────── */
function ApplicantSection({
  label, count, candidates, onSelect,
}: {
  label: string;
  count: number;
  candidates: CandidateCard[];
  onSelect: (c: CandidateCard) => void;
}) {
  const [page, setPage] = useState(0);
  const PAGE = 3;
  const pages = Math.ceil(candidates.length / PAGE);
  const slice = candidates.slice(page * PAGE, (page + 1) * PAGE);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">{label}</span>
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white/60"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            {count}
          </span>
        </div>
        {pages > 1 && (
          <div className="flex gap-0.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 disabled:opacity-20 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <ChevronLeft size={11} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 disabled:opacity-20 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <ChevronRight size={11} />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {slice.map(c => (
          <ApplicantCardTile key={c.id} c={c} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

/* ── Full applicants-view chat message ───────────────────────────────────── */
function ApplicantsViewMessage({
  data,
  onCandidateSelect,
}: {
  data: ApplicantsViewData;
  onCandidateSelect: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 540 }}>
      {/* Job card */}
      <div
        className="rounded-xl px-4 py-3 flex items-start justify-between"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
      >
        <div>
          <p className="text-sm font-semibold text-white">{data.jobTitle}</p>
          <p className="text-xs text-white/40 mt-0.5">{data.jobMeta}</p>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5"
          style={{ background: "rgba(30,210,94,0.12)", color: "#1ed25e", border: "1px solid rgba(30,210,94,0.2)" }}
        >
          Screening
        </span>
      </div>

      {/* Stats */}
      <ul className="text-xs text-white/60 leading-relaxed space-y-1 list-none pl-0">
        <li>• Of {data.totalApplicants} applicants, there are {data.closeMatchCount} close matches I'd recommend considering.</li>
        {data.suggestions.length > 0 && (
          <li>• I've also found {data.suggestions.length} additional candidates who are a strong fit. If you like, I can invite them to apply.</li>
        )}
      </ul>

      {/* Recommended */}
      {data.recommended.length > 0 && (
        <ApplicantSection
          label="Recommended applicants"
          count={data.recommended.length}
          candidates={data.recommended}
          onSelect={c => onCandidateSelect(`Tell me more about ${c.name}`)}
        />
      )}

      {/* AI suggestions */}
      {data.suggestions.length > 0 && (
        <ApplicantSection
          label="AI suggestions — invite to apply"
          count={data.suggestions.length}
          candidates={data.suggestions}
          onSelect={c => onCandidateSelect(`Tell me more about ${c.name}`)}
        />
      )}
    </div>
  );
}

/* ── Candidate detail chat card ──────────────────────────────────────────── */
function CandidateDetailCard({ data }: { data: CandidateDetailData }) {
  return (
    <div
      className="rounded-xl p-4 w-full"
      style={{ maxWidth: 300, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
    >
      <div className="flex items-start gap-3">
        <CandidateAvatar name={data.name} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">{data.name}</p>
              <p className="text-xs text-white/50 mt-0.5 leading-tight truncate">{data.title}</p>
            </div>
            <ScoreCircle score={data.matchScore} />
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
            <span className="flex items-center gap-1"><MapPin size={9} />{data.location}</span>
            <span className="flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" className="opacity-60">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
              </svg>
              {data.experienceYears} yrs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Chat input bar ──────────────────────────────────────────────────────── */
function ChatInputBar({
  onSend,
  waiting = false,
  placeholder = "Ask anything",
}: {
  onSend: (text: string) => void;
  waiting?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const msg = value.trim();
    if (!msg || waiting) return;
    onSend(msg);
    setValue("");
  };

  return (
    <div className="rounded-2xl overflow-hidden w-full"
      style={{
        background: "var(--surface-dim)",
        border: "1px solid var(--surface-hover)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="px-4 pt-3 pb-1">
        <input
          type="text"
          value={value}
          disabled={waiting}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-white placeholder-white/25 outline-none disabled:cursor-wait"
        />
      </div>
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <button className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          style={{ border: "1px solid var(--glass-btn-border)" }}>
          <Plus size={14} />
        </button>
        <AnimatePresence mode="wait">
          {waiting ? (
            <motion.div key="spin" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Loader2 size={15} className="animate-spin text-[var(--accent)]" />
            </motion.div>
          ) : value.trim() ? (
            <motion.button key="send"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={submit}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white"
              style={{ background: "var(--accent)" }}>
              <ArrowUp size={14} />
            </motion.button>
          ) : (
            <motion.div key="wave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-7 h-7 flex items-center justify-center text-white/35">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="9" width="2.5" height="6" rx="1.25" opacity="0.45" />
                <rect x="6" y="6" width="2.5" height="12" rx="1.25" opacity="0.65" />
                <rect x="10" y="3" width="2.5" height="18" rx="1.25" />
                <rect x="14" y="6" width="2.5" height="12" rx="1.25" opacity="0.65" />
                <rect x="18" y="9" width="2.5" height="6" rx="1.25" opacity="0.45" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Chat conversation view ──────────────────────────────────────────────── */
function ChatView({
  messages,
  isTyping,
  onSend,
  onChipClick,
  onCreateJobPosting,
  sessionReady = true,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (text: string) => void;
  onChipClick: (chip: string) => void;
  onCreateJobPosting: (jobCard: NonNullable<ChatMessage["jobCard"]>) => void;
  sessionReady?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-6 pb-4">
      <div className="max-w-2xl mx-auto px-5 space-y-5">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[380px] rounded-2xl px-4 py-3"
                    style={{ background: "var(--surface-muted)", border: "1px solid var(--surface-faint)" }}>
                    <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ) : msg.type === "job-posted" && msg.job ? (
                <div className="flex justify-start">
                  <div className="flex flex-col gap-2 max-w-[480px] w-full">
                    <p className="text-sm text-white/55">Success! This role has been posted successfully.</p>
                    <div className="flex items-start justify-between px-4 py-3.5 rounded-2xl"
                      style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-soft)" }}>
                      <div>
                        <p className="text-sm font-semibold text-white">{msg.job.title}</p>
                        <p className="text-xs text-white/35 mt-0.5">
                          {[msg.job.department, msg.job.location, "Just Now"].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      <button className="text-white/30 hover:text-white/60 transition-colors mt-0.5">
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start flex-col gap-3" style={{ maxWidth: msg.applicantsView ? 560 : 520 }}>
                  {msg.text && (
                    <p className="text-sm text-white/80 leading-relaxed">
                      {msg.text}
                    </p>
                  )}
                  {/* Applicants view */}
                  {msg.applicantsView && (
                    <ApplicantsViewMessage
                      data={msg.applicantsView}
                      onCandidateSelect={onChipClick}
                    />
                  )}
                  {/* Candidate detail card */}
                  {msg.candidateDetail && (
                    <CandidateDetailCard data={msg.candidateDetail} />
                  )}
                  {/* Option chips */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.options.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => onChipClick(chip)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white/70 hover:text-white/95 hover:border-white/25 transition-all duration-150"
                          style={{ background: "var(--surface-elevated)", border: "1px solid var(--glass-btn-border)" }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Inline job card */}
                  {msg.jobCard && (
                    <div className="rounded-2xl overflow-hidden w-full max-w-[320px]"
                      style={{ background: "var(--surface-dim)", border: "1px solid var(--border-soft)" }}>
                      <div className="px-4 pt-3.5 pb-3 flex flex-col gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{msg.jobCard.title}</p>
                          <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                            <MapPin size={10} /> {msg.jobCard.location}
                          </p>
                        </div>
                        {msg.jobCard.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {msg.jobCard.skills.slice(0, 3).map(s => (
                              <span key={s} className="px-2.5 py-1 rounded-full text-[11px] text-white/55"
                                style={{ background: "var(--surface-subtle)", border: "1px solid var(--border-faint)" }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onCreateJobPosting(msg.jobCard!)}
                        className="w-full py-2.5 text-sm font-semibold text-black transition-colors"
                        style={{ background: "var(--accent)" }}
                      >
                        Create Job Posting
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div key="typing"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex justify-start">
              <div className="flex items-center gap-1.5 py-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/35 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>

      {/* Pinned input */}
      <div className="pb-6 pt-3 flex-shrink-0">
        <div className="max-w-2xl mx-auto px-5">
          <ChatInputBar onSend={onSend} waiting={isTyping || !sessionReady}
            placeholder={!sessionReady ? "Connecting to AI…" : "Ask anything"} />
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function EmployerDashboard({ onBack }: EmployerDashboardProps) {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [hiringKey, setHiringKey] = useState(0);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [sessionReady, setSessionReady] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState<Partial<JobFormData>>({});
  const sessionStartedRef = useRef(false);
  const muteCleanupRef = useRef<(() => void) | null>(null);
  const promptOptionsRef = useRef<PromptStepOptions>({ step1: [], step2: [], step3: [] });
  const collectedJobRef = useRef<{ role?: string; experience?: string; location?: string }>({});
  const pendingFieldRef = useRef<"role" | "experience" | "location" | null>(null);
  // Set to true once a job card has been emitted; suppresses any AI follow-up
  // messages (description paragraphs etc.) that arrive in later speech turns.
  const jobCardShownRef = useRef(false);
  // When wizard finishes we store the job here so the success card shows the actual title (not "New role").
  const pendingSuccessJobRef = useRef<{ title: string; department: string; location: string } | null>(null);
  /** Last applicants-view message (so CANDIDATE_DETAIL can resolve posting_id without stale `messages` in flush). */
  const lastApplicantsContextRef = useRef<{ jobId: string; jobTitle: string } | null>(null);

  // useTeleSpeech captures the AI's text via the LiveKit data channel
  // (avatar_talking_message → avatar_start_talking → avatar_stop_talking).
  // Avatar stays connected so the data channel is alive; all audio is
  // suppressed by the mute loop (volume=0, muted=true on all elements).
  const { speech, isTalking } = useTeleSpeech();
  const prevIsTalkingRef = useRef(false);
  // Accumulates ALL speech chunks for the current AI response. Long replies
  // (e.g. full job postings) arrive as multiple start/stop talking cycles.
  const chunkBufferRef = useRef<string[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety: clear typing indicator if no response received (e.g. tool hang, no speech).
  useEffect(() => {
    if (!isTyping) return;
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      typingTimeoutRef.current = null;
    }, 25000);
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [isTyping]);

  // Debounced display: collect every speech chunk and only commit the combined
  // response once the avatar has been silent for 900 ms.
  const flushResponse = useCallback(() => {
    const full = chunkBufferRef.current.join(" ").trim();
    if (!sessionReady) { chunkBufferRef.current = []; return; }
    if (!full) {
      chunkBufferRef.current = [];
      // After location we expect the job card; don't clear typing on empty chunk — wait for more.
      const c = collectedJobRef.current;
      if (c.role && c.experience && c.location) {
        silenceTimerRef.current = setTimeout(flushResponse, 2000);
        return;
      }
      setIsTyping(false);
      return;
    }

    // Do not show the wizard payload in chat (user or echo).
    if (/^Create job posting with the following details:/i.test(full.trim())) {
      chunkBufferRef.current = [];
      setIsTyping(false);
      return;
    }

    // ── Success after job posted (Mobeus confirmed) — show success card ─────
    if (/success|role has been posted|posted successfully/i.test(full)) {
      chunkBufferRef.current = [];
      const pending = pendingSuccessJobRef.current;
      const c = collectedJobRef.current;
      const title = pending?.title ?? ([c.experience, c.role].filter(Boolean).join(" ").trim() || "New role");
      const department = pending?.department ?? "Engineering";
      const location = pending?.location ?? c.location ?? "";
      pendingSuccessJobRef.current = null;
      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: "",
        type: "job-posted",
        job: {
          title,
          department,
          location,
          postedAt: new Date(),
        },
      }]);
      setIsTyping(false);
      return;
    }

    // If [JOB_DATA: is present but the closing ] hasn't arrived yet, the SDK
    // split the marker across speech cycles. Keep the buffer and wait another
    // 1.5 s for the rest of the marker before flushing.
    if (/\[JOB_DATA:/i.test(full) && !/\[JOB_DATA:[\s\S]*?\]/i.test(full)) {
      silenceTimerRef.current = setTimeout(flushResponse, 1500);
      return;
    }

    // After location we expect the job card. Keep typing until we have [JOB_DATA]; never show
    // the lead-in as a normal message (that would clear typing before the card appears).
    const hasFullJobData = /\[JOB_DATA:[\s\S]*?\]/i.test(full);
    const c = collectedJobRef.current;
    const expectingJobCard = Boolean(c.role && c.experience && c.location);
    const isNewQuestionOrOptions = /what role|where will|experience level|\[OPTIONS:|sorry|error|couldn't|unable/i.test(full);
    if (expectingJobCard && !hasFullJobData && !isNewQuestionOrOptions) {
      silenceTimerRef.current = setTimeout(flushResponse, 2000);
      return;
    }

    chunkBufferRef.current = [];

    // If a job card was already shown, suppress any AI follow-up messages
    // (e.g. description paragraphs the AI sends in a second speech turn).
    // Reset the flag only when the AI starts a brand-new role question.
    if (jobCardShownRef.current) {
      if (/what role|which role|role are you (hiring|looking)|role.*hire for/i.test(full)) {
        jobCardShownRef.current = false; // new conversation — allow messages again
      } else {
        setIsTyping(false);
        return;
      }
    }

    // ── 1. [VIEW_APPLICANTS: ...] — prefer data from Mobeus cacheJobApplicants(); else POST /api/invoke/get_job_applicants
    const { displayText: afterViewApplicants, jobTitle: viewJobTitle, postingId: viewPostingId } =
      parseViewApplicants(full);
    if (viewJobTitle) {
      chunkBufferRef.current = [];
      const { displayText: vaText, options: vaOptionsFromAi } = parseInlineOptions(afterViewApplicants);
      const confirmText = vaText.trim();
      const followUpChips =
        vaOptionsFromAi.length > 0 ? vaOptionsFromAi : REVIEW_APPLICANTS_FOLLOW_UP_OPTIONS;

      const runApplicantsView = async () => {
        const pid = viewPostingId;
        if (!pid) {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "assistant",
              text: confirmText,
              options: followUpChips,
            },
          ]);
          setIsTyping(false);
          return;
        }
        try {
          let data = getCachedJobApplicants(pid);
          if (!data) {
            data = await invokeGetJobApplicants(pid, true);
          }
          const applicantsView = buildApplicantsViewData(pid, viewJobTitle, "", data);
          lastApplicantsContextRef.current = { jobId: applicantsView.jobId, jobTitle: applicantsView.jobTitle };
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "assistant",
              text: confirmText,
              type: "applicants-view",
              applicantsView,
              options: followUpChips,
            },
          ]);
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "assistant",
              text: confirmText,
              options: followUpChips,
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      };

      setIsTyping(true);
      void runApplicantsView();
      return;
    }

    // ── 2. [CANDIDATE_DETAIL: ...] — show candidate card + follow-up options
    const {
      displayText: afterCandidateDetail,
      candidateName,
      postingId: candidatePostingId,
    } = parseCandidateDetail(full);
    if (candidateName) {
      chunkBufferRef.current = [];
      const { displayText: cdText, options: cdOptionsFromAi } = parseInlineOptions(afterCandidateDetail);
      const introText = cdText.trim();

      const runCandidateDetail = async () => {
        const ctxFromRef = lastApplicantsContextRef.current;
        const pid = candidatePostingId ?? ctxFromRef?.jobId ?? null;
        const jobTitleForCard = ctxFromRef?.jobTitle ?? "";

        if (!pid) {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "assistant",
              text: introText,
              options: cdOptionsFromAi,
            },
          ]);
          setIsTyping(false);
          return;
        }

        try {
          let data = getCachedJobApplicants(pid);
          if (!data) {
            data = await invokeGetJobApplicants(pid, true);
          }
          const norm = (s: string) => s.trim().toLowerCase();
          const target = norm(candidateName);
          const app = data.items.find(
            (a: ApplicationWithProfileResponse) =>
              norm(a.candidate_name ?? "") === target ||
              norm(a.candidate_name ?? "").includes(target.split(" ")[0] ?? ""),
          );
          if (!app) {
            setMessages((prev) => [
              ...prev,
              {
                id: `ai-${Date.now()}`,
                role: "assistant",
                text: introText,
                options: cdOptionsFromAi,
              },
            ]);
            setIsTyping(false);
            return;
          }
          const card = applicationToCandidateCard(app, jobTitleForCard || "Applicant");
          const candidateDetail: CandidateDetailData = {
            ...card,
            jobTitle: jobTitleForCard,
          };
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "assistant",
              text: introText,
              type: "candidate-detail",
              candidateDetail,
              options: cdOptionsFromAi,
            },
          ]);
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "assistant",
              text: introText,
              options: cdOptionsFromAi,
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      };

      setIsTyping(true);
      void runCandidateDetail();
      return;
    }

    // ── 3. Try to parse [JOB_DATA: ...] — primary job-card trigger ────────────
    const { displayText: afterJobData, jobCard } = parseJobData(full);
    if (jobCard) {
      // Keep only the first two sentences (the short confirmation); discard any
      // description the AI appended before or after the marker.
      const confirmText = (afterJobData.match(/(?:[^.!?]*[.!?]){1,2}/) ?? [""])[0].trim();
      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`, role: "assistant",
        text: confirmText,
        jobCard,
      }]);
      jobCardShownRef.current = true;
      setIsTyping(false);
      return;
    }

    // ── 4. Fallback: SDK stripped [JOB_DATA:...] but AI confirmed it's ready ──
    // Only fire when all three fields were collected in THIS conversation to
    // prevent stale data from a previous conversation creating a wrong card.
    if (/opening the posting form|pre-filled now/i.test(full)) {
      const c = collectedJobRef.current;
      if (c.role && c.experience && c.location) {
        const title = cleanTitle([c.experience, c.role].filter(Boolean).join(" ")) || "New Role";
        // Keep only the first two sentences of the confirmation; strip anything after.
        const confirmText = (full.match(/(?:[^.!?]*[.!?]){1,2}/) ?? [""])[0].trim();
        setMessages((prev) => [...prev, {
          id: `ai-${Date.now()}`, role: "assistant", text: confirmText,
          jobCard: { title, location: c.location!, description: "", skills: [], mustHave: [], preferred: [], niceToHave: [] },
        }]);
        jobCardShownRef.current = true;
        setIsTyping(false);
        return;
      }
      // Collected data incomplete — fall through to show as plain text,
      // the [JOB_DATA:] chunk will arrive in the next speech turn.
    }

    // ── 5. Normal message — resolve chips and track current step ─────────────
    const { displayText, options: inlineOptions } = parseInlineOptions(full);
    const options = inlineOptions.length > 0
      ? inlineOptions
      : resolveFallbackOptions(full, promptOptionsRef.current);

    // Never show raw [OPTIONS: ...] in chat; use displayText or empty when only options arrived.
    const inferredText = displayText.trim()
      ? displayText
      : (inlineOptions.length > 0 ? "" : full);

    const step = resolveCurrentStep(inferredText);
    if (step === "role") {
      // New job posting flow starting — clear any data collected in a prior conversation
      collectedJobRef.current = {};
    }
    if (step) pendingFieldRef.current = step;

    // Deduplicate: if the AI sends the same question+chips in two speech cycles
    // (text cycle + options-only cycle), discard the second one.
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      const sameOptions = options.length > 0
        && last?.role === "assistant"
        && last.options?.join("|") === options.join("|");
      if (sameOptions) return prev; // already shown — skip duplicate
      return [...prev, {
        id: `ai-${Date.now()}`, role: "assistant", text: inferredText,
        ...(options.length ? { options } : {}),
      }];
    });
    setIsTyping(false);
  }, [sessionReady]);

  useEffect(() => {
    if (isTalking) {
      // New chunk starting — cancel pending flush so we keep accumulating
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (speech) chunkBufferRef.current.push(speech);
      // Re-show loading indicator when a new chunk starts (the AI may send a
      // short acknowledgement like "Understood." then pause before the full
      // response; flushResponse would have cleared isTyping during that gap).
      if (sessionReady) setIsTyping(true);
    }
    if (!isTalking && prevIsTalkingRef.current) {
      // Avatar just went silent — wait 900 ms before committing. If another
      // chunk starts within that window the timer is cancelled above.
      silenceTimerRef.current = setTimeout(flushResponse, 900);
    }
    prevIsTalkingRef.current = isTalking;
  }, [isTalking, speech, flushResponse, sessionReady]);

  /* Block navigateToSection; register cacheJobApplicants (employer path may never mount usePhaseFlow). */
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const siteFunc = (window as any).UIFrameworkSiteFunctions;
    if (!siteFunc) return;
    const originalNav = siteFunc.navigateToSection;
    const originalCache = siteFunc.cacheJobApplicants;
    siteFunc.navigateToSection = () => {
      console.warn("[EmployerDashboard] navigateToSection blocked");
      return { disableNewResponseCreation: false };
    };
    siteFunc.cacheJobApplicants = (postingId: string, data: unknown) =>
      cacheJobApplicantsFromTool(postingId, data);
    return () => {
      if (originalNav) siteFunc.navigateToSection = originalNav;
      if (originalCache) siteFunc.cacheJobApplicants = originalCache;
      else delete siteFunc.cacheJobApplicants;
    };
  }, []);

  /* Block mic for the entire employer session lifetime.
     __employerMode is read by the getUserMedia intercept in index.html.
     Setting it here (not inside startChatSession) ensures it is true for ALL
     async LiveKit track setup that happens after connectAll() resolves. */
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__employerMode = true;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__employerMode = false;
      muteCleanupRef.current?.();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  /* Suppress all avatar visuals and audio whenever chat mode is active.
     SDK API calls fire ONCE on enter. The MutationObserver only processes
     newly added nodes to avoid a mutation → style-change → mutation loop. */
  useEffect(() => {
    if (!chatMode) return;

    const framework = fw();
    if (framework) {
      if (typeof framework.hideBgLayer === "function") (framework.hideBgLayer as () => void)();
      if (typeof framework.deactivateVisualInversion === "function") (framework.deactivateVisualInversion as () => void)();
      if (typeof framework.setVoiceChatVisibility === "function") (framework.setVoiceChatVisibility as (v: boolean) => void)(false);
      if (typeof framework.setAvatarVolume === "function") (framework.setAvatarVolume as (v: number) => void)(0);
      if (typeof framework.setAvatarVideoMuted === "function") (framework.setAvatarVideoMuted as (v: boolean) => void)(true);
      if (typeof framework.updateConfig === "function") (framework.updateConfig as (c: object) => void)({ muteByDefault: true, voiceUIVisible: false });
    }

    const avatarSelectors = ['[data-layer="bg"]', '[data-layer="avatar"]', '[class*="voice-widget"]', '[class*="avatar-container"]', '[class*="heygen"]', '[id*="avatar"]'];

    const hideMatching = (root: ParentNode) => {
      root.querySelectorAll("audio, video").forEach((el) => {
        (el as HTMLMediaElement).muted = true;
        (el as HTMLMediaElement).volume = 0;
      });
      avatarSelectors.forEach((sel) => {
        root.querySelectorAll(sel).forEach((el) => { (el as HTMLElement).style.display = "none"; });
      });
    };

    hideMatching(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLMediaElement) {
            node.muted = true;
            node.volume = 0;
          } else if (node instanceof HTMLElement) {
            hideMatching(node);
          }
        });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, [chatMode]);

  /* Connect the AI session on mount */
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    loadEmployerPrompt()
      .then((prompt) => {
        promptOptionsRef.current = extractOptionsFromPrompt(prompt);
        return startChatSession(prompt).then(() => prompt);
      })
      .then((prompt) => {
        // Start the persistent mute loop — SDK resets volume after each utterance
        muteCleanupRef.current = startMuteLoop();
        // Delay sessionReady by 3s so ALL initial talent greetings (fired during
        // connectAll) cycle through isTalking true→false while sessionReady is
        // still false. The useTeleSpeech effect discards them. After 3s, only
        // genuine employer replies to user messages will pass the gate.
        // No sendGreeting() — sending any message here triggers the talent agent
        // to respond with talent content, polluting the chat.
        setTimeout(() => {
          // Reinforce employer prompt one final time before opening the chat.
          // Use updateVoicePrompt only — no TellTele/teleAcknowledge which would
          // cause a visible AI response.
          const framework = fw();
          if (framework && typeof framework.updateVoicePrompt === "function")
            (framework.updateVoicePrompt as (p: string) => void)(prompt);
          // Discard any speech captured during the startup window so stale
          // talent greetings can't appear when the gate opens.
          chunkBufferRef.current = [];
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setSessionReady(true);
        }, 3000);
      })
      .catch(() => setSessionReady(true));
  }, []);

  const handleSend = useCallback((text: string) => {
    const trimmed = text.trim();

    // ── Regular AI flow (Mobeus calls tools; UI just sends message) ─────────
    const field = pendingFieldRef.current;
    if (field) {
      collectedJobRef.current[field] = text;
      pendingFieldRef.current = null;
    }
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setChatMode(true);
    setIsTyping(true);
    chunkBufferRef.current = [];
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    sendChatText(trimmed);
  }, []);

  const handleChipClick = useCallback((chip: string) => {
    handleSend(chip);
  }, [handleSend]);

  // "Create Job Posting" on card only opens the wizard; only wizard Finish sends to Mobeus.
  const handleCreateJobPosting = useCallback((jobCard: NonNullable<ChatMessage["jobCard"]>) => {
    setWizardInitialData({
      title: jobCard.title,
      location: jobCard.location !== "Remote" ? jobCard.location : "",
      description: jobCard.description,
      skills: { mustHave: jobCard.mustHave, preferred: jobCard.preferred, niceToHave: jobCard.niceToHave },
    });
    setWizardOpen(true);
  }, []);

  // Build message for Mobeus when user clicks Finish in wizard (any flow). Prompt parses and calls create_job_posting.
  const buildCreateJobMessage = useCallback((form: JobFormData) => {
    const lines = [
      "Create job posting with the following details:",
      `title: ${form.title}`,
      `department: ${form.department || "Engineering"}`,
      `location: ${form.location}`,
      `employment_type: ${form.employmentType || "Full Time"}`,
      `description: ${form.description}`,
      `must_have: ${form.skills.mustHave.join(", ")}`,
      `preferred: ${form.skills.preferred.join(", ")}`,
      `nice_to_have: ${form.skills.niceToHave.join(", ")}`,
      `salary_min: ${form.salaryMin || ""}`,
      `salary_max: ${form.salaryMax || ""}`,
      "posted_by: Omar S.",
    ];
    return lines.join("\n");
  }, []);


  return (
    <div className="relative w-screen h-screen overflow-hidden flex" style={{ background: "var(--bg)", zIndex: 100, position: "relative" }}>

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 60% at 75% 10%, var(--accent-surface-subtle) 0%, transparent 65%)",
      }} />
      <div className="absolute pointer-events-none" style={{
        width: 500, height: 500, top: "-15%", right: "-5%",
        background: "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
        filter: "blur(60px)",
      }} />

      {/* Left sidebar */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}
        className="hidden md:flex relative z-20 flex-col items-center gap-5 py-8 px-3"
        style={{ width: 60, background: "var(--surface-sidebar)", borderRight: "1px solid var(--surface-subtle)" }}>
        {sidebarIcons.map(({ icon: Icon, label }) => (
          <button key={label} aria-label={label}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/35 hover:text-white/70 transition-colors">
            <Icon size={17} />
          </button>
        ))}
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}
          className="relative z-20 flex items-center justify-between px-5 sm:px-8 pt-5 pb-3 flex-shrink-0">
          <span className="text-xl font-bold text-white tracking-tight">
            tr<span style={{ color: "var(--accent)" }}>AI</span>n
          </span>

          <div className="hidden sm:flex items-center rounded-full p-1 gap-0.5"
            style={{ background: "var(--surface-subtle)", border: "1px solid var(--border-soft)" }}>
            {(["home", "hiring", "workforce"] as NavTab[]).map((tab) => (
              <button key={tab}
                onClick={() => {
                  if (tab === "hiring" && activeTab === "hiring") setHiringKey((k) => k + 1);
                  setActiveTab(tab);
                  setChatMode(false);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all duration-200",
                  activeTab === tab && !chatMode ? "text-white" : "text-white/45 hover:text-white/70",
                )}
                style={activeTab === tab && !chatMode
                  ? { background: "var(--glass-btn-border)", border: "1px solid var(--border-medium)" }
                  : {}}>
                {tab === "home" ? "Home" : tab === "hiring" ? "Hiring" : "Workforce"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {chatMode && (
              <button onClick={() => setChatMode(false)}
                className="text-xs text-white/40 hover:text-white/70 transition-colors mr-1">
                ← Dashboard
              </button>
            )}
            {!chatMode && onBack && (
              <button onClick={onBack}
                className="hidden sm:block text-xs text-white/30 hover:text-white/60 transition-colors mr-1">
                ← Switch role
              </button>
            )}
            <button className="relative w-8 h-8 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            </button>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-white/5 transition-colors"
              style={{ border: "1px solid var(--border-soft)" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                style={{ background: "var(--avatar-gradient)" }}>O</div>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-xs font-medium text-white/85">Omar S.</span>
                <span className="text-[10px] text-white/40 mt-0.5">Hiring Manager</span>
              </div>
              <ChevronDown size={11} className="text-white/35 hidden sm:block" />
            </button>
          </div>
        </motion.header>

        {/* Mobile tab nav */}
        {!chatMode && (
          <div className="sm:hidden flex items-center gap-1 px-5 pb-2 flex-shrink-0">
            {(["home", "hiring", "workforce"] as NavTab[]).map((tab) => (
              <button key={tab} onClick={() => {
                  if (tab === "hiring" && activeTab === "hiring") setHiringKey((k) => k + 1);
                  setActiveTab(tab);
                }}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all duration-200",
                  activeTab === tab ? "text-white" : "text-white/45")}
                style={activeTab === tab
                  ? { background: "var(--border-soft)", border: "1px solid var(--border-medium)" }
                  : { border: "1px solid transparent" }}>
                {tab === "home" ? "Home" : tab === "hiring" ? "Hiring" : "Workforce"}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">

          {chatMode && (
            <motion.div key="chat"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden">

              <AnimatePresence mode="wait">
                {wizardOpen ? (
                  /* Wizard inline — sits between header (with tabs) and input */
                  <motion.div key="wizard-inline"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 flex flex-col overflow-hidden">
                    {/* Centered wizard card */}
                    <div className="flex-1 flex items-center justify-center overflow-y-auto px-4 py-6">
                      <PostJobWizardCard
                        initialData={wizardInitialData}
                        onClose={() => { setWizardOpen(false); setWizardInitialData({}); }}
                        onFinish={(formData) => {
                          setWizardOpen(false);
                          setWizardInitialData({});
                          setChatMode(true);
                          pendingSuccessJobRef.current = {
                            title: formData.title,
                            department: formData.department || "Engineering",
                            location: formData.location,
                          };
                          setIsTyping(true);
                          sendChatText(buildCreateJobMessage(formData));
                        }}
                      />
                    </div>
                    {/* Pinned input always visible at bottom */}
                    <div className="pb-6 pt-3 flex-shrink-0">
                      <div className="max-w-2xl mx-auto px-5">
                        <ChatInputBar onSend={handleSend} waiting placeholder="Ask anything" />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="chat-messages"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 flex flex-col overflow-hidden">
                    <ChatView
                      messages={messages}
                      isTyping={isTyping}
                      onSend={handleSend}
                      onChipClick={handleChipClick}
                      onCreateJobPosting={handleCreateJobPosting}
                      sessionReady={sessionReady}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {!chatMode && (
            <motion.div key="dashboard"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden">

              <div className="flex-1 overflow-y-auto overflow-x-hidden">

                {activeTab === "home" && (
                  <motion.div key="home"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col px-5 sm:px-8 pb-8 pt-4 sm:pt-6 gap-4 sm:gap-6">

                    <div>
                      <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--accent)" }}>
                        <SparkleIcon size={14} />
                        <span className="text-sm font-medium">Hello Omar</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white leading-tight">
                        Where should we begin?
                      </h1>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <ActionCard icon={<Building2 size={16} />} label="Post a job" color="#1ed25e"
                        onClick={() => {
                          setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", text: "Post a job" }]);
                          setChatMode(true);
                          setWizardOpen(true);
                        }} />
                      <ActionCard icon={<UserCheck size={16} />} label="Review Candidates" color="#51a2ff"
                        onClick={() => handleSend("Review applicants")} />
                      <ActionCard icon={<BookOpen size={16} />} label="Track Development" color="#a78bfa"
                        onClick={() => handleSend("How is my training program?")} />
                    </div>

                    <ChatInputBar onSend={handleSend} waiting={!sessionReady} placeholder={sessionReady ? "Or ask anything" : "Connecting to AI…"} />

                    <div className="flex flex-wrap gap-2">
                      {[
                        "Where are our biggest gaps?",
                        "What needs my attention today?",
                        "How is our hiring?",
                      ].map((chip) => (
                        <SuggestionChip key={chip} label={chip} onClick={() => handleSend(chip)} />
                      ))}
                    </div>
                  </motion.div>
                )}


                {activeTab === "hiring" && (
                  <motion.div key="hiring"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <HiringTabContent key={hiringKey} />
                  </motion.div>
                )}

                {activeTab === "workforce" && (
                  <motion.div key="workforce"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col px-5 sm:px-8 pb-8 min-h-full">
                    <WorkforceTabContent />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating bottom pill */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full pointer-events-auto"
            style={{
              background: "var(--surface-pill)",
              border: "1px solid var(--border-soft)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px var(--shadow-overlay)",
            }}>
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/80 transition-colors">
              <SparkleIcon size={15} />
            </button>
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/80 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="9" width="2.5" height="6" rx="1.25" opacity="0.45" />
                <rect x="6" y="6" width="2.5" height="12" rx="1.25" opacity="0.65" />
                <rect x="10" y="3" width="2.5" height="18" rx="1.25" />
                <rect x="14" y="6" width="2.5" height="12" rx="1.25" opacity="0.65" />
                <rect x="18" y="9" width="2.5" height="6" rx="1.25" opacity="0.45" />
              </svg>
            </button>
            <button
              onClick={() => chatMode ? setChatMode(false) : setChatMode(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "var(--accent)" }}>
              <MessageCircle size={15} className="text-black" />
            </button>
          </div>
        </div>

        {/* Mobile tab bar (xs only) */}
        <div className="sm:hidden flex-shrink-0 flex items-center justify-around px-4 py-2"
          style={{ background: "var(--surface-sidebar)", borderTop: "1px solid var(--surface-elevated)" }}>
          {sidebarIcons.slice(0, 4).map(({ icon: Icon, label }) => (
            <button key={label} aria-label={label}
              className="flex flex-col items-center gap-1 text-white/30 hover:text-white/60 transition-colors">
              <Icon size={18} />
            </button>
          ))}
          <button
            onClick={() => chatMode ? setChatMode(false) : null}
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-[10px]">
            <ChevronDown size={18} style={{ transform: chatMode ? "rotate(180deg)" : "none" }} />
            <span>{chatMode ? "Home" : "More"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
