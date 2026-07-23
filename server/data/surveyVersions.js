/**
 * Survey Versions Mock Data - Question sets for survey application
 *
 * @fileoverview Sample survey versions with all 7 question types
 * @author SurveyFlow Team
 */
import { v4 as uuidv4 } from "uuid";

const surveyVersions = [
  // Employee Satisfaction Survey questions
  {
    surveyTitle: "Employee Satisfaction Survey 2024",
    version: 2,
    sections: [
      {
        id: "general-info",
        title: "General Information",
        description: "Basic information about your role and experience",
        order: 1,
      },
      {
        id: "satisfaction",
        title: "Job Satisfaction",
        description: "Questions about your job satisfaction and workplace experience",
        order: 2,
      },
      {
        id: "feedback",
        title: "Additional Feedback",
        description: "Open-ended feedback and suggestions",
        order: 3,
      },
    ],
    questions: [
      {
        id: uuidv4(),
        type: "short_text",
        title: "What is your current job title?",
        helpText: "Please provide your official job title",
        required: true,
        sectionId: "general-info",
        order: 1,
        validation: {
          maxLength: 100,
        },
      },
      {
        id: uuidv4(),
        type: "dropdown",
        title: "Which department do you work in?",
        required: true,
        sectionId: "general-info",
        order: 2,
        options: [
          "Engineering",
          "Design",
          "Product Management",
          "Marketing",
          "Sales",
          "Human Resources",
          "Finance",
          "Operations",
          "Customer Success",
        ],
      },
      {
        id: uuidv4(),
        type: "rating",
        title: "How satisfied are you with your current role?",
        helpText: "Rate your overall job satisfaction",
        required: true,
        sectionId: "satisfaction",
        order: 3,
        ratingScale: 5,
      },
      {
        id: uuidv4(),
        type: "single_choice",
        title: "Would you recommend this company as a great place to work?",
        required: true,
        sectionId: "satisfaction",
        order: 4,
        options: [
          "Definitely yes",
          "Probably yes",
          "Might or might not",
          "Probably not",
          "Definitely not",
        ],
      },
      {
        id: uuidv4(),
        type: "multiple_choice",
        title: "Which of the following areas do you think need improvement?",
        helpText: "Select all that apply",
        required: false,
        sectionId: "satisfaction",
        order: 5,
        options: [
          "Work-life balance",
          "Career development opportunities",
          "Compensation and benefits",
          "Management communication",
          "Team collaboration",
          "Office environment",
          "Company culture",
          "Recognition and rewards",
        ],
        validation: {
          maxSelections: 5,
        },
      },
      {
        id: uuidv4(),
        type: "long_text",
        title: "What suggestions do you have for improving employee satisfaction?",
        helpText: "Please provide specific suggestions or ideas",
        required: false,
        sectionId: "feedback",
        order: 6,
        validation: {
          maxLength: 1000,
        },
      },
      {
        id: uuidv4(),
        type: "date",
        title: "When did you join the company?",
        helpText: "Please provide your start date",
        required: true,
        sectionId: "general-info",
        order: 7,
      },
    ],
    // surveyId and companyId will be set during seeding
  },

  // Client Service Quality Assessment questions
  {
    surveyTitle: "Client Service Quality Assessment",
    version: 1,
    sections: [
      {
        id: "experience",
        title: "Service Experience",
        description: "Tell us about your experience with our services",
        order: 1,
      },
    ],
    questions: [
      {
        id: uuidv4(),
        type: "short_text",
        title: "Company/Organization Name",
        required: true,
        sectionId: "experience",
        order: 1,
        validation: {
          maxLength: 150,
        },
      },
      {
        id: uuidv4(),
        type: "rating",
        title: "How would you rate the overall quality of our consulting services?",
        required: true,
        sectionId: "experience",
        order: 2,
        ratingScale: 10,
      },
      {
        id: uuidv4(),
        type: "single_choice",
        title: "How likely are you to recommend our services to others?",
        required: true,
        sectionId: "experience",
        order: 3,
        options: [
          "Extremely likely",
          "Very likely",
          "Somewhat likely",
          "Not very likely",
          "Not at all likely",
        ],
      },
      {
        id: uuidv4(),
        type: "multiple_choice",
        title: "Which aspects of our service exceeded your expectations?",
        helpText: "Select all that apply",
        required: false,
        sectionId: "experience",
        order: 4,
        options: [
          "Expertise and knowledge",
          "Timeliness of delivery",
          "Communication and responsiveness",
          "Problem-solving approach",
          "Value for money",
          "Professional attitude",
          "Follow-up support",
        ],
      },
      {
        id: uuidv4(),
        type: "long_text",
        title: "Please provide any additional comments about your experience",
        helpText: "Your detailed feedback helps us improve our services",
        required: false,
        sectionId: "experience",
        order: 5,
        validation: {
          maxLength: 800,
        },
      },
    ],
  },

  // Public Space Usage Study questions
  {
    surveyTitle: "Public Space Usage Study",
    version: 1,
    sections: [
      {
        id: "usage",
        title: "Space Usage",
        description: "How you use public spaces in your community",
        order: 1,
      },
    ],
    questions: [
      {
        id: uuidv4(),
        type: "dropdown",
        title: "What is your age group?",
        required: true,
        sectionId: "usage",
        order: 1,
        options: [
          "Under 18",
          "18-24",
          "25-34",
          "35-44",
          "45-54",
          "55-64",
          "65 and over",
        ],
      },
      {
        id: uuidv4(),
        type: "multiple_choice",
        title: "Which public spaces do you use most frequently?",
        helpText: "Select all that apply",
        required: true,
        sectionId: "usage",
        order: 2,
        options: [
          "Parks and gardens",
          "Playgrounds",
          "Sports facilities",
          "Walking/cycling paths",
          "Public plazas",
          "Benches and seating areas",
          "Community centers",
          "Markets and food courts",
        ],
        validation: {
          minSelections: 1,
          maxSelections: 8,
        },
      },
      {
        id: uuidv4(),
        type: "rating",
        title: "How satisfied are you with the maintenance of public spaces?",
        required: true,
        sectionId: "usage",
        order: 3,
        ratingScale: 5,
      },
      {
        id: uuidv4(),
        type: "long_text",
        title: "What improvements would you like to see in your local public spaces?",
        helpText: "Please be specific about locations and types of improvements",
        required: false,
        sectionId: "usage",
        order: 4,
        validation: {
          maxLength: 600,
        },
      },
    ],
  },

  // Patient Experience Survey questions
  {
    surveyTitle: "Patient Experience Survey",
    version: 2,
    sections: [
      {
        id: "visit-info",
        title: "Visit Information",
        description: "Basic information about your recent visit",
        order: 1,
      },
      {
        id: "experience-rating",
        title: "Experience Rating",
        description: "Rate different aspects of your care",
        order: 2,
      },
    ],
    questions: [
      {
        id: uuidv4(),
        type: "date",
        title: "Date of your most recent visit",
        required: true,
        sectionId: "visit-info",
        order: 1,
      },
      {
        id: uuidv4(),
        type: "dropdown",
        title: "Type of visit",
        required: true,
        sectionId: "visit-info",
        order: 2,
        options: [
          "Routine check-up",
          "Urgent care",
          "Specialist consultation",
          "Emergency visit",
          "Follow-up appointment",
          "Diagnostic test/procedure",
        ],
      },
      {
        id: uuidv4(),
        type: "rating",
        title: "How would you rate the courtesy and helpfulness of the staff?",
        required: true,
        sectionId: "experience-rating",
        order: 3,
        ratingScale: 5,
      },
      {
        id: uuidv4(),
        type: "rating",
        title: "How would you rate your healthcare provider's communication?",
        helpText: "Consider how well they listened, explained, and answered questions",
        required: true,
        sectionId: "experience-rating",
        order: 4,
        ratingScale: 5,
      },
      {
        id: uuidv4(),
        type: "single_choice",
        title: "Would you recommend this healthcare facility to friends and family?",
        required: true,
        sectionId: "experience-rating",
        order: 5,
        options: [
          "Definitely yes",
          "Probably yes",
          "Undecided",
          "Probably no",
          "Definitely no",
        ],
      },
      {
        id: uuidv4(),
        type: "long_text",
        title: "Please share any additional comments about your visit",
        helpText: "Your feedback helps us improve patient care",
        required: false,
        sectionId: "experience-rating",
        order: 6,
        validation: {
          maxLength: 500,
        },
      },
    ],
  },
];

export default surveyVersions;