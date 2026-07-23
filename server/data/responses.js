/**
 * Responses Mock Data - Sample survey responses with Map-based answers
 *
 * @fileoverview Sample survey responses for survey application testing
 * @author SurveyFlow Team
 */

const responses = [
  // Employee Satisfaction Survey responses
  {
    surveyTitle: "Employee Satisfaction Survey 2024",
    responses: [
      {
        recipientName: "John Smith",
        recipientPhone: "+254712345678",
        recipientEmail: "john.smith@company.com",
        submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        completionTime: 420, // 7 minutes in seconds
        device: "Desktop",
        // answers will be populated dynamically based on survey questions
        answerTemplate: {
          "job-title": "Senior Software Engineer",
          "department": "Engineering",
          "satisfaction-rating": 4,
          "recommend-company": "Probably yes",
          "improvement-areas": ["Career development opportunities", "Recognition and rewards"],
          "suggestions": "More opportunities for technical learning and cross-team collaboration would be great.",
          "join-date": "2022-03-15",
        },
      },
      {
        recipientName: "Maria Garcia",
        recipientPhone: "+254723456789",
        recipientEmail: "maria.garcia@company.com",
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completionTime: 380,
        device: "Mobile",
        answerTemplate: {
          "job-title": "Product Designer",
          "department": "Design",
          "satisfaction-rating": 5,
          "recommend-company": "Definitely yes",
          "improvement-areas": ["Work-life balance", "Office environment"],
          "suggestions": "The company culture is amazing! Maybe some ergonomic improvements to workstations.",
          "join-date": "2021-08-20",
        },
      },
      {
        recipientName: "Lisa Wong",
        recipientPhone: "+254745678901",
        recipientEmail: "lisa.wong@company.com",
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completionTime: 290,
        device: "Tablet",
        answerTemplate: {
          "job-title": "Marketing Manager",
          "department": "Marketing",
          "satisfaction-rating": 3,
          "recommend-company": "Might or might not",
          "improvement-areas": ["Management communication", "Compensation and benefits"],
          "suggestions": "More transparent communication about company goals and individual performance expectations.",
          "join-date": "2023-01-10",
        },
      },
    ],
  },

  // Client Service Quality Assessment responses
  {
    surveyTitle: "Client Service Quality Assessment",
    responses: [
      {
        recipientName: "Corporate Solutions Ltd",
        recipientPhone: "+254767890123",
        recipientEmail: "contact@corpsolutions.com",
        submittedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        completionTime: 180,
        device: "Desktop",
        answerTemplate: {
          "company-name": "Corporate Solutions Ltd",
          "service-quality": 9,
          "recommend-likelihood": "Very likely",
          "exceeded-expectations": ["Expertise and knowledge", "Timeliness of delivery", "Communication and responsiveness"],
          "additional-comments": "Excellent service from start to finish. The team was knowledgeable, responsive, and delivered on time. We will definitely work with them again.",
        },
      },
      {
        recipientName: "Jennifer Martinez",
        recipientPhone: "+254778901234",
        recipientEmail: "j.martinez@techstartup.co",
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completionTime: 220,
        device: "Desktop",
        answerTemplate: {
          "company-name": "TechStartup Co",
          "service-quality": 8,
          "recommend-likelihood": "Very likely",
          "exceeded-expectations": ["Problem-solving approach", "Professional attitude", "Follow-up support"],
          "additional-comments": "Great problem-solving skills and very professional team. The follow-up support after project completion was particularly impressive.",
        },
      },
      {
        recipientName: "Global Manufacturing Co",
        recipientPhone: "+254790123456",
        recipientEmail: "procurement@globalmanuf.com",
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completionTime: 165,
        device: "Desktop",
        answerTemplate: {
          "company-name": "Global Manufacturing Co",
          "service-quality": 7,
          "recommend-likelihood": "Somewhat likely",
          "exceeded-expectations": ["Value for money", "Expertise and knowledge"],
          "additional-comments": "Good value for money and solid expertise. The project was completed satisfactorily.",
        },
      },
    ],
  },

  // Public Space Usage Study responses
  {
    surveyTitle: "Public Space Usage Study",
    responses: [
      {
        recipientName: "Community Member 1",
        recipientPhone: "+254701234567",
        recipientEmail: "resident1@email.com",
        submittedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        completionTime: 240,
        device: "Mobile",
        answerTemplate: {
          "age-group": "35-44",
          "used-spaces": ["Parks and gardens", "Walking/cycling paths", "Playgrounds"],
          "maintenance-satisfaction": 3,
          "improvements": "More benches along walking paths and better lighting in the evening. The playground equipment needs updating too.",
        },
      },
      {
        recipientName: "Community Member 2",
        recipientPhone: "+254712345678",
        recipientEmail: "resident2@email.com",
        submittedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        completionTime: 195,
        device: "Desktop",
        answerTemplate: {
          "age-group": "25-34",
          "used-spaces": ["Sports facilities", "Public plazas", "Markets and food courts"],
          "maintenance-satisfaction": 4,
          "improvements": "More sports facilities for basketball and tennis. The food court area could use more seating and shade.",
        },
      },
    ],
  },

  // Patient Experience Survey responses
  {
    surveyTitle: "Patient Experience Survey",
    responses: [
      {
        recipientName: "Patricia Davis",
        recipientPhone: "+254723456781",
        recipientEmail: "patricia.davis@gmail.com",
        submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completionTime: 300,
        device: "Mobile",
        answerTemplate: {
          "visit-date": "2024-01-15",
          "visit-type": "Routine check-up",
          "staff-courtesy": 5,
          "provider-communication": 5,
          "recommend-facility": "Definitely yes",
          "additional-comments": "Excellent care from the entire team. The doctor took time to explain everything clearly and the nurses were very helpful.",
        },
      },
      {
        recipientName: "Thomas Wilson",
        recipientPhone: "+254734567892",
        recipientEmail: "thomas.wilson@outlook.com",
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completionTime: 210,
        device: "Desktop",
        answerTemplate: {
          "visit-date": "2024-01-18",
          "visit-type": "Specialist consultation",
          "staff-courtesy": 4,
          "provider-communication": 4,
          "recommend-facility": "Probably yes",
          "additional-comments": "Good overall experience. Wait time was a bit long but the quality of care was excellent.",
        },
      },
      {
        recipientName: "Carlos Rodriguez",
        recipientPhone: "+254756789014",
        recipientEmail: "carlos.rodriguez@gmail.com",
        submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        completionTime: 180,
        device: "Mobile",
        answerTemplate: {
          "visit-date": "2024-01-20",
          "visit-type": "Follow-up appointment",
          "staff-courtesy": 5,
          "provider-communication": 4,
          "recommend-facility": "Definitely yes",
          "additional-comments": "Very satisfied with the follow-up care and attention to detail.",
        },
      },
    ],
  },
];

export default responses;