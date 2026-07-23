/**
 * Surveys Mock Data - Sample survey templates for survey application
 *
 * @fileoverview Sample surveys with various statuses and configurations
 * @author SurveyFlow Team
 */
import { v4 as uuidv4 } from "uuid";

const surveys = [
  // TechFlow Solutions surveys
  {
    title: "Employee Satisfaction Survey 2024",
    description: "Annual employee satisfaction and engagement survey to understand team morale and identify areas for improvement.",
    status: "published",
    publicId: uuidv4(),
    themeColor: "#3b82f6",
    thankYouMessage: "Thank you for sharing your valuable feedback! Your responses help us create a better workplace for everyone.",
    isWhitelistEnabled: true,
    currentVersion: 2,
    publishedVersion: 2,
    captureMetadata: false,
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    // companyId and createdBy will be set during seeding
  },
  {
    title: "New Employee Onboarding Feedback",
    description: "Help us improve our onboarding process by sharing your experience as a new team member.",
    status: "draft",
    publicId: uuidv4(),
    themeColor: "#3b82f6",
    thankYouMessage: "Thanks for helping us improve our onboarding experience!",
    isWhitelistEnabled: false,
    currentVersion: 1,
    publishedVersion: null,
    captureMetadata: true,
  },
  {
    title: "Q4 Team Performance Review",
    description: "Quarterly team performance and project feedback survey.",
    status: "closed",
    publicId: uuidv4(),
    themeColor: "#3b82f6",
    thankYouMessage: "Thank you for your participation in the Q4 review!",
    isWhitelistEnabled: true,
    currentVersion: 1,
    publishedVersion: 1,
    captureMetadata: false,
    publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  },

  // GreenLeaf Consulting surveys
  {
    title: "Client Service Quality Assessment",
    description: "We value your opinion! Please share your experience with our consulting services.",
    status: "published",
    publicId: uuidv4(),
    themeColor: "#10b981",
    thankYouMessage: "Thank you for taking the time to evaluate our services. Your feedback drives our commitment to excellence!",
    isWhitelistEnabled: true,
    currentVersion: 1,
    publishedVersion: 1,
    captureMetadata: false,
    publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
  },
  {
    title: "Sustainability Practices Survey",
    description: "Help us understand current sustainability practices in your organization.",
    status: "draft",
    publicId: uuidv4(),
    themeColor: "#10b981",
    thankYouMessage: "Thank you for contributing to our sustainability research!",
    isWhitelistEnabled: false,
    currentVersion: 3,
    publishedVersion: null,
    captureMetadata: true,
  },

  // Urban Design Studio surveys
  {
    title: "Public Space Usage Study",
    description: "Community survey about how public spaces are used and what improvements are needed.",
    status: "published",
    publicId: uuidv4(),
    themeColor: "#f59e0b",
    thankYouMessage: "Thank you for helping us design better public spaces for our community!",
    isWhitelistEnabled: false,
    currentVersion: 1,
    publishedVersion: 1,
    captureMetadata: true,
    publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
  },
  {
    title: "Architectural Design Preferences",
    description: "Survey for upcoming residential project to understand design preferences and requirements.",
    status: "draft",
    publicId: uuidv4(),
    themeColor: "#f59e0b",
    thankYouMessage: "Your input will help create beautiful, functional living spaces!",
    isWhitelistEnabled: true,
    currentVersion: 2,
    publishedVersion: null,
    captureMetadata: false,
  },

  // HealthCare Innovations surveys
  {
    title: "Patient Experience Survey",
    description: "Please share your experience with our healthcare services to help us improve patient care.",
    status: "published",
    publicId: uuidv4(),
    themeColor: "#ef4444",
    thankYouMessage: "Thank you for your feedback! Your experience matters to us and helps us provide better care.",
    isWhitelistEnabled: true,
    currentVersion: 2,
    publishedVersion: 2,
    captureMetadata: false,
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  },
  {
    title: "Healthcare Staff Wellness Check",
    description: "Internal survey to assess staff wellness and identify support needs.",
    status: "draft",
    publicId: uuidv4(),
    themeColor: "#ef4444",
    thankYouMessage: "Thank you for taking time to share about your wellness. Your wellbeing is our priority!",
    isWhitelistEnabled: true,
    currentVersion: 1,
    publishedVersion: null,
    captureMetadata: false,
  },
];

export default surveys;