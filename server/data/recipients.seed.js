const recipientSeeds = [
  // Recipients for New Employee Onboarding Feedback (Non-Linear)
  {
    surveyTitle: "New Employee Onboarding Feedback (Non-Linear)",
    recipients: [
      {
        name: "Alex Rivera",
        email: "alex.rivera@techflow.com",
        phone: "+254700111222",
        status: "completed",
        invitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Priya Patel",
        email: "priya.patel@techflow.com",
        phone: "+254700222333",
        status: "completed",
        invitedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Marcus Johnson",
        email: "marcus.johnson@techflow.com",
        phone: "+254700333444",
        status: "completed",
        invitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Sofia Chen",
        email: "sofia.chen@techflow.com",
        phone: "+254700444555",
        status: "invited",
        invitedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        name: "James O'Brien",
        email: "james.obrien@techflow.com",
        phone: "+254700555666",
        status: "pending",
      },
      {
        name: "Amara Okafor",
        email: "amara.okafor@techflow.com",
        phone: "+254700666777",
        status: "completed",
        invitedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
    ],
  },

  // Recipients for Customer Satisfaction Pulse (Mostly Linear)
  {
    surveyTitle: "Customer Satisfaction Pulse (Mostly Linear)",
    recipients: [
      {
        name: "Emily Watson",
        email: "emily.watson@clientco.com",
        phone: "+254711222333",
        status: "completed",
        invitedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        name: "David Kim",
        email: "david.kim@enterprise.io",
        phone: "+254711333444",
        status: "completed",
        invitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Rachel Green",
        email: "rachel.green@startup.co",
        phone: "+254711444555",
        status: "completed",
        invitedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Mohamed Ali",
        email: "mohamed.ali@bizgroup.com",
        phone: "+254711555666",
        status: "invited",
        invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Lisa Anderson",
        email: "lisa.anderson@techcorp.net",
        phone: "+254711666777",
        status: "completed",
        invitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  },

  // Recipients for Internal Tool Feedback (Advanced Non-Linear)
  {
    surveyTitle: "Internal Tool Feedback (Advanced Non-Linear)",
    recipients: [
      {
        name: "Kevin Zhang",
        email: "kevin.zhang@techflow.com",
        phone: "+254722111222",
        status: "completed",
        invitedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Nina Kowalski",
        email: "nina.kowalski@techflow.com",
        phone: "+254722222333",
        status: "completed",
        invitedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Raj Sharma",
        email: "raj.sharma@techflow.com",
        phone: "+254722333444",
        status: "completed",
        invitedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Carmen Rodriguez",
        email: "carmen.rodriguez@techflow.com",
        phone: "+254722444555",
        status: "completed",
        invitedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Tom Hendricks",
        email: "tom.hendricks@techflow.com",
        phone: "+254722555666",
        status: "invited",
        invitedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Yuki Tanaka",
        email: "yuki.tanaka@techflow.com",
        phone: "+254722666777",
        status: "pending",
      },
    ],
  },
];

export default recipientSeeds;
