import React from "react";

type AnyTemplate = React.ComponentType<Record<string, unknown>>;

/**
 * Maps templateId strings (sent by the Runtime Agent via navigateToSection) to
 * lazy-loaded React components. Add new templates here as the platform grows.
 *
 * Note: TeleSpeechBubble is NOT a template — it lives permanently in BaseLayout
 * and shows whatever the avatar is currently saying. Templates only render
 * interactive layers (options, forms, cards).
 */
export const TEMPLATE_REGISTRY: Record<string, React.LazyExoticComponent<AnyTemplate>> = {
  EmptyScreen: React.lazy(() =>
    import("@/components/templates/EmptyScreen").then((m) => ({
      default: m.EmptyScreen as unknown as AnyTemplate,
    }))
  ),
  WelcomeLanding: React.lazy(() =>
    import("@/components/templates/WelcomeLanding").then((m) => ({
      default: m.WelcomeLanding as unknown as AnyTemplate,
    }))
  ),
  GlassmorphicOptions: React.lazy(() =>
    import("@/components/templates/GlassmorphicOptions").then((m) => ({
      default: m.GlassmorphicOptions as unknown as AnyTemplate,
    }))
  ),
  MultiSelectOptions: React.lazy(() =>
    import("@/components/templates/MultiSelectOptions").then((m) => ({
      default: m.MultiSelectOptions as unknown as AnyTemplate,
    }))
  ),
  RegistrationForm: React.lazy(() =>
    import("@/components/templates/RegistrationForm").then((m) => ({
      default: m.RegistrationForm as unknown as AnyTemplate,
    }))
  ),
  LoadingGeneral: React.lazy(() =>
    import("@/components/templates/LoadingGeneral").then((m) => ({
      default: m.LoadingGeneral as unknown as AnyTemplate,
    }))
  ),
  LoadingLinkedIn: React.lazy(() =>
    import("@/components/templates/LoadingLinkedIn").then((m) => ({
      default: m.LoadingLinkedIn as unknown as AnyTemplate,
    }))
  ),
  CardStack: React.lazy(() =>
    import("@/components/templates/CardStackTemplate").then((m) => ({
      default: m.CardStackTemplate as unknown as AnyTemplate,
    }))
  ),
  CardStackJobPreviewSheet: React.lazy(() =>
    import("@/components/templates/CardStackJobPreviewSheet").then((m) => ({
      default: m.CardStackJobPreviewSheet as unknown as AnyTemplate,
    }))
  ),
  Dashboard: React.lazy(() =>
    import("@/components/templates/Dashboard").then((m) => ({
      default: m.Dashboard as unknown as AnyTemplate,
    }))
  ),
  ProfileSheet: React.lazy(() =>
    import("@/components/templates/ProfileSheet").then((m) => ({
      default: m.ProfileSheet as unknown as AnyTemplate,
    }))
  ),
  CandidateSheet: React.lazy(() =>
    import("@/components/templates/CandidateSheet").then((m) => ({
      default: m.CandidateSheet as unknown as AnyTemplate,
    }))
  ),
  TextInput: React.lazy(() =>
    import("@/components/templates/TextInput").then((m) => ({
      default: m.TextInput as unknown as AnyTemplate,
    }))
  ),
  SkillCoverageSheet: React.lazy(() =>
    import("@/components/templates/SkillCoverageSheet").then((m) => ({
      default: m.SkillCoverageSheet as unknown as AnyTemplate,
    }))
  ),
  JobSearchSheet: React.lazy(() =>
    import("@/components/templates/JobSearchSheet").then((m) => ({
      default: m.JobSearchSheet as unknown as AnyTemplate,
    }))
  ),
  JobDetailSheet: React.lazy(() =>
    import("@/components/templates/JobDetailSheet").then((m) => ({
      default: m.JobDetailSheet as unknown as AnyTemplate,
    }))
  ),
  EligibilitySheet: React.lazy(() =>
    import("@/components/templates/EligibilitySheet").then((m) => ({
      default: m.EligibilitySheet as unknown as AnyTemplate,
    }))
  ),
  CloseGapSheet: React.lazy(() =>
    import("@/components/templates/CloseGapSheet").then((m) => ({
      default: m.CloseGapSheet as unknown as AnyTemplate,
    }))
  ),
  JobApplicationsSheet: React.lazy(() =>
    import("@/components/templates/JobApplicationsSheet").then((m) => ({
      default: m.JobApplicationsSheet as unknown as AnyTemplate,
    }))
  ),
  PastApplicationsSheet: React.lazy(() =>
    import("@/components/templates/PastApplicationsSheet").then((m) => ({
      default: m.PastApplicationsSheet as unknown as AnyTemplate,
    }))
  ),
  SkillsDetail: React.lazy(() =>
    import("@/components/templates/SkillsDetail").then((m) => ({
      default: m.SkillsDetail as unknown as AnyTemplate,
    }))
  ),
  MarketRelevanceDetail: React.lazy(() =>
    import("@/components/templates/MarketRelevanceDetail").then((m) => ({
      default: m.MarketRelevanceDetail as unknown as AnyTemplate,
    }))
  ),
  CareerGrowthDetail: React.lazy(() =>
    import("@/components/templates/CareerGrowthDetail").then((m) => ({
      default: m.CareerGrowthDetail as unknown as AnyTemplate,
    }))
  ),
  MarketRelevanceSheet: React.lazy(() =>
    import("@/components/templates/MarketRelevanceSheet").then((m) => ({
      default: m.MarketRelevanceSheet as unknown as AnyTemplate,
    }))
  ),
  CareerGrowthSheet: React.lazy(() =>
    import("@/components/templates/CareerGrowthSheet").then((m) => ({
      default: m.CareerGrowthSheet as unknown as AnyTemplate,
    }))
  ),
  MyLearningTemplate: React.lazy(() =>
    import("@/components/templates/MyLearningTemplate").then((m) => ({
      default: m.MyLearningTemplate as unknown as AnyTemplate,
    }))
  ),
  TargetRoleTemplate: React.lazy(() =>
    import("@/components/templates/TargetRoleTemplate").then((m) => ({
      default: m.TargetRoleTemplate as unknown as AnyTemplate,
    }))
  ),
};

/**
 * Required props for each template. DynamicSectionLoader validates these on
 * every render and sends [CORRECTION NEEDED] to the AI if any are missing.
 */
export const REQUIRED_PROPS: Record<string, string[]> = {
  EmptyScreen: [],
  WelcomeLanding: [],
  GlassmorphicOptions: ["bubbles"],
  MultiSelectOptions: ["bubbles"],
  RegistrationForm: [],
  LoadingGeneral: [],
  LoadingLinkedIn: [],
  CardStack: [],
  CardStackJobPreviewSheet: [],
  Dashboard: [],
  ProfileSheet: ["name"],
  CandidateSheet: [],
  TextInput: [],
  SkillCoverageSheet: [],
  JobSearchSheet: [],
  JobDetailSheet: [],
  EligibilitySheet: [],
  CloseGapSheet: [],
  JobApplicationsSheet: [],
  PastApplicationsSheet: [],
  SkillsDetail: [],
  MarketRelevanceDetail: [],
  CareerGrowthDetail: [],
  MarketRelevanceSheet: [],
  CareerGrowthSheet: [],
  MyLearningTemplate: [],
  TargetRoleTemplate: [],
};
