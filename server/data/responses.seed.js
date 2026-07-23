const responseSeeds = [
  // Responses for New Employee Onboarding Feedback (Non-Linear)
  {
    surveyTitle: "New Employee Onboarding Feedback (Non-Linear)",
    responses: [
      // Path 1: Has blockers → support section shows → completes all sections
      {
        recipientName: "Alex Rivera",
        recipientEmail: "alex.rivera@techflow.com",
        recipientPhone: "+254700111222",
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completionTime: 380,
        device: "Desktop",
        answerTemplate: {
          roleSatisfaction: 4,
          onboardingClarity: "Very clear",
          blockers: "Minor blockers",
          blockerDetail:
            "Waiting for access to some internal tools, but the team is helping me resolve it.",
          mentorHelpfulness: 5,
          resourcesRating: 4,
          overall: 4,
          otherNeed: "More technical documentation would be helpful.",
        },
      },
      // Path 2: No blockers → jumps to wrap section (skips support)
      {
        recipientName: "Priya Patel",
        recipientEmail: "priya.patel@techflow.com",
        recipientPhone: "+254700222333",
        submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        completionTime: 240,
        device: "Mobile",
        answerTemplate: {
          roleSatisfaction: 5,
          onboardingClarity: "Very clear",
          blockers: "No blockers",
          // Skip support section due to navigation rule
          overall: 5,
          // exitReason not shown (overall > 2)
          otherNeed: "Everything is going great!",
        },
      },
      // Path 3: Low satisfaction → exitReason question shows
      {
        recipientName: "Marcus Johnson",
        recipientEmail: "marcus.johnson@techflow.com",
        recipientPhone: "+254700333444",
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completionTime: 420,
        device: "Desktop",
        answerTemplate: {
          roleSatisfaction: 2,
          onboardingClarity: "Unclear",
          blockers: "Major blockers",
          blockerDetail:
            "Role expectations were not clear. Struggling to understand priorities and deliverables.",
          mentorHelpfulness: 3,
          resourcesRating: 2,
          overall: 2,
          exitReason: "Lack of clarity",
          otherNeed:
            "Better role definition and clear expectations from management.",
        },
      },
      // Path 4: Major blockers → shows support section
      {
        recipientName: "Amara Okafor",
        recipientEmail: "amara.okafor@techflow.com",
        recipientPhone: "+254700666777",
        submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completionTime: 310,
        device: "Tablet",
        answerTemplate: {
          roleSatisfaction: 3,
          onboardingClarity: "Somewhat clear",
          blockers: "Major blockers",
          blockerDetail:
            "System access issues and missing equipment delayed my start.",
          mentorHelpfulness: 4,
          resourcesRating: 3,
          overall: 3,
          otherNeed: "Faster IT setup process.",
        },
      },
    ],
  },

  // Responses for Customer Satisfaction Pulse (Mostly Linear)
  {
    surveyTitle: "Customer Satisfaction Pulse (Mostly Linear)",
    responses: [
      // Path 1: High satisfaction → no follow-up comment needed
      {
        recipientName: "Emily Watson",
        recipientEmail: "emily.watson@clientco.com",
        recipientPhone: "+254711222333",
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completionTime: 120,
        device: "Desktop",
        answerTemplate: {
          overall: 5,
          channel: "Email",
          issueResolved: "Yes",
          // followup not shown (overall >= 4)
        },
      },
      // Path 2: Low satisfaction → follow-up comment shows
      {
        recipientName: "David Kim",
        recipientEmail: "david.kim@enterprise.io",
        recipientPhone: "+254711333444",
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completionTime: 180,
        device: "Mobile",
        answerTemplate: {
          overall: 2,
          channel: "Chat",
          issueResolved: "Partially",
          followup:
            "Response time was slow and the issue wasn't fully resolved on first contact.",
        },
      },
      // Path 3: Medium satisfaction
      {
        recipientName: "Rachel Green",
        recipientEmail: "rachel.green@startup.co",
        recipientPhone: "+254711444555",
        submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        completionTime: 150,
        device: "Desktop",
        answerTemplate: {
          overall: 4,
          channel: "Phone",
          issueResolved: "Yes",
          // followup not shown
        },
      },
      // Path 4: Low satisfaction with unresolved issue
      {
        recipientName: "Lisa Anderson",
        recipientEmail: "lisa.anderson@techcorp.net",
        recipientPhone: "+254711666777",
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completionTime: 200,
        device: "Mobile",
        answerTemplate: {
          overall: 3,
          channel: "In-app",
          issueResolved: "Partially",
          followup:
            "The feature request wasn't addressed, but support was helpful in explaining limitations.",
        },
      },
    ],
  },

  // Responses for Internal Tool Feedback (Advanced Non-Linear)
  {
    surveyTitle: "Internal Tool Feedback (Advanced Non-Linear)",
    responses: [
      // Path 1: CRM user → jumps to ops section
      {
        recipientName: "Kevin Zhang",
        recipientEmail: "kevin.zhang@techflow.com",
        recipientPhone: "+254722111222",
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completionTime: 280,
        device: "Desktop",
        answerTemplate: {
          primaryTool: "CRM",
          // Jumps to ops section, skipping experience/blockers/wishlist
          lastOutage: "2026-01-20",
          reopenTicket: "No",
        },
      },
      // Path 2: Low UI rating → jumps to wishlist
      {
        recipientName: "Nina Kowalski",
        recipientEmail: "nina.kowalski@techflow.com",
        recipientPhone: "+254722222333",
        submittedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        completionTime: 350,
        device: "Desktop",
        answerTemplate: {
          primaryTool: "Data Portal",
          uiRating: 2,
          performanceRating: 3,
          // Jumps to wishlist due to low UI rating
          desiredFeatures: [
            "Faster load times",
            "Better search",
            "Mobile support",
          ],
          lastOutage: null,
          reopenTicket: null,
        },
      },
      // Path 3: Perfect performance → terminates early
      {
        recipientName: "Raj Sharma",
        recipientEmail: "raj.sharma@techflow.com",
        recipientPhone: "+254722333444",
        submittedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        completionTime: 180,
        device: "Mobile",
        answerTemplate: {
          primaryTool: "Release Console",
          uiRating: 4,
          performanceRating: 5,
          // Survey terminates here (performance >= 5)
        },
      },
      // Path 4: Has blockers → shows blocker details
      {
        recipientName: "Carmen Rodriguez",
        recipientEmail: "carmen.rodriguez@techflow.com",
        recipientPhone: "+254722444555",
        submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completionTime: 420,
        device: "Desktop",
        answerTemplate: {
          primaryTool: "Helpdesk",
          uiRating: 3,
          performanceRating: 4,
          blockerType: "Bugs",
          blockerDetail:
            "Ticket assignment system occasionally fails to notify assignees.",
          desiredFeatures: ["Faster load times", "Audit trails"],
          lastOutage: "2026-01-15",
          reopenTicket: "Yes",
        },
      },
    ],
  },
];

export default responseSeeds;
