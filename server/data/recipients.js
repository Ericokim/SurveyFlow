/**
 * Recipients Mock Data - Survey invitation recipients with proper phone/email formats
 *
 * @fileoverview Sample recipients for survey application testing
 * @author SurveyFlow Team
 */

const recipients = [
  // Recipients for Employee Satisfaction Survey (TechFlow)
  {
    surveyTitle: "Employee Satisfaction Survey 2024",
    recipients: [
      {
        name: "John Smith",
        phone: "+254712345678",
        email: "john.smith@company.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Maria Garcia",
        phone: "+254723456789",
        email: "maria.garcia@company.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Robert Johnson",
        phone: "+254734567890",
        email: "robert.johnson@company.com",
        status: "invited",
        invitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Lisa Wong",
        phone: "+254745678901",
        email: "lisa.wong@company.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Ahmed Hassan",
        phone: "+254756789012",
        email: "ahmed.hassan@company.com",
        status: "pending",
      },
    ],
  },

  // Recipients for Client Service Quality Assessment (GreenLeaf)
  {
    surveyTitle: "Client Service Quality Assessment",
    recipients: [
      {
        name: "Corporate Solutions Ltd",
        phone: "+254767890123",
        email: "contact@corpsolutions.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Jennifer Martinez",
        phone: "+254778901234",
        email: "j.martinez@techstartup.co",
        status: "completed",
        invitedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Michael Brown",
        phone: "+254789012345",
        email: "mbrown@consulting.org",
        status: "invited",
        invitedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Global Manufacturing Co",
        phone: "+254790123456",
        email: "procurement@globalmanuf.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  },

  // Recipients for Public Space Usage Study (Urban Design) - Open survey, fewer recipients
  {
    surveyTitle: "Public Space Usage Study",
    recipients: [
      {
        name: "Community Member 1",
        phone: "+254701234567",
        email: "resident1@email.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Community Member 2",
        phone: "+254712345678",
        email: "resident2@email.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
    ],
  },

  // Recipients for Patient Experience Survey (HealthCare)
  {
    surveyTitle: "Patient Experience Survey",
    recipients: [
      {
        name: "Patricia Davis",
        phone: "+254723456781",
        email: "patricia.davis@gmail.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Thomas Wilson",
        phone: "+254734567892",
        email: "thomas.wilson@outlook.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Susan Anderson",
        phone: "+254745678903",
        email: "susan.anderson@yahoo.com",
        status: "invited",
        invitedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Carlos Rodriguez",
        phone: "+254756789014",
        email: "carlos.rodriguez@gmail.com",
        status: "completed",
        invitedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Elena Petrov",
        phone: "+254767890125",
        email: "elena.petrov@email.com",
        status: "pending",
      },
    ],
  },
];

export default recipients;