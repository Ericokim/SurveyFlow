/**
 * Users Mock Data - Admin and viewer users for survey application
 *
 * @fileoverview Sample users with proper authentication and role-based access
 * @author SurveyFlow Team
 */

const users = [
  // TechFlow Solutions users
  {
    name: "Sarah Johnson",
    email: "admin@techflow.com",
    passwordHash: "password123", // Will be hashed by pre-save hook
    role: "admin",
    isActive: true,
    preferences: {
      theme: "light",
    },
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastActiveAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    // companyId will be set dynamically during seeding
  },
  {
    name: "Mike Chen",
    email: "viewer@techflow.com",
    passwordHash: "password123",
    role: "viewer",
    isActive: true,
    preferences: {
      theme: "dark",
    },
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    lastActiveAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
  },
  {
    name: "Emily Rodriguez",
    email: "analyst@techflow.com",
    passwordHash: "password123",
    role: "viewer",
    isActive: true,
    preferences: {
      theme: "system",
    },
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    lastActiveAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
  },

  // GreenLeaf Consulting users
  {
    name: "David Wilson",
    email: "admin@greenleaf.com",
    passwordHash: "password123",
    role: "admin",
    isActive: true,
    preferences: {
      theme: "light",
    },
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    lastActiveAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
  {
    name: "Lisa Thompson",
    email: "viewer@greenleaf.com",
    passwordHash: "password123",
    role: "viewer",
    isActive: true,
    preferences: {
      theme: "light",
    },
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    lastActiveAt: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago
  },

  // Urban Design Studio users
  {
    name: "Alex Kumar",
    email: "admin@urbandesign.com",
    passwordHash: "password123",
    role: "admin",
    isActive: true,
    preferences: {
      theme: "dark",
    },
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    lastActiveAt: new Date(Date.now() - 11 * 60 * 60 * 1000), // 11 hours ago
  },
  {
    name: "Rachel Green",
    email: "designer@urbandesign.com",
    passwordHash: "password123",
    role: "viewer",
    isActive: true,
    preferences: {
      theme: "light",
    },
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    lastActiveAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  },

  // HealthCare Innovations users
  {
    name: "Dr. James Martinez",
    email: "admin@healthcare.com",
    passwordHash: "password123",
    role: "admin",
    isActive: true,
    preferences: {
      theme: "light",
    },
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    lastActiveAt: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
  },
  {
    name: "Nurse Amanda Clark",
    email: "nurse@healthcare.com",
    passwordHash: "password123",
    role: "viewer",
    isActive: false, // Make one inactive user for testing
    preferences: {
      theme: "system",
    },
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    lastActiveAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
  },
];

export default users;