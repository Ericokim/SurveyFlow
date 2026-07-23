import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Zap,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  XCircle,
  GitBranch,
  Target,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { SimpleLogicDropdown } from "./SimpleLogicDropdown";
import { cn } from "../../lib/utils";

/**
 * LogicSetupPanel Component
 *
 * Enhanced contextual logic setup with visual flow representation
 * Makes complex survey logic accessible to non-technical users
 */
export function LogicSetupPanel({
  question,
  questions = [],
  sections = [],
  currentSectionId,
  onLogicChange,
  getOptionLogic,
  trigger,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("overview"); // "overview", "detailed"

  if (!question) return null;

  const isChoiceQuestion = ["single_choice", "multiple_choice", "dropdown"].includes(question.type);
  const options = question.options || [];

  // Analyze current logic setup
  const logicAnalysis = {
    hasLogic: options.some(opt => {
      const logic = getOptionLogic?.(question.id, opt);
      return logic && logic.type !== 'continue';
    }),
    totalPaths: options.length,
    logicPaths: options.filter(opt => {
      const logic = getOptionLogic?.(question.id, opt);
      return logic && logic.type !== 'continue';
    }).length,
    complexityScore: "Simple" // Could be calculated based on logic depth
  };

  const handleLogicChange = (optionValue, newLogic) => {
    onLogicChange?.(question.id, optionValue, newLogic);
  };

  const renderLogicFlowVisualization = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">Logic Flow</h3>
          <Badge variant={logicAnalysis.hasLogic ? "default" : "secondary"} className="text-xs">
            {logicAnalysis.logicPaths} of {logicAnalysis.totalPaths} paths have logic
          </Badge>
        </div>

        <div className="space-y-3">
          {options.map((option, index) => {
            const logic = getOptionLogic?.(question.id, option);
            const hasCustomLogic = logic && logic.type !== 'continue';

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                  hasCustomLogic
                    ? "border-indigo-200 bg-indigo-50"
                    : "border-slate-200 bg-slate-50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-slate-900">{option}</span>
                    {hasCustomLogic && (
                      <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                        <Zap className="w-3 h-3 mr-1" />
                        Logic
                      </Badge>
                    )}
                  </div>

                  {/* Logic Action Description */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">When selected:</span>
                    {hasCustomLogic ? (
                      <div className="flex items-center gap-1">
                        {logic.type === 'end' && (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-700">End survey</span>
                          </>
                        )}
                        {logic.type === 'jump' && (
                          <>
                            <ExternalLink className="w-4 h-4 text-blue-500" />
                            <span className="text-blue-700">
                              Jump to {sections.find(s => s.id === logic.targetSectionId)?.title || 'Section'}
                            </span>
                          </>
                        )}
                        {logic.type === 'jump_to_question' && (
                          <>
                            <MessageSquare className="w-4 h-4 text-purple-500" />
                            <span className="text-purple-700">
                              Jump to {questions.find((q) => q.id === logic.targetQuestionId)?.title || "Question"}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">Continue to next question</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logic Control */}
                <div className="flex-shrink-0">
                  <SimpleLogicDropdown
                    questionId={question.id}
                    currentSectionId={currentSectionId}
                    sections={sections}
                    questions={questions}
                    value={(() => {
                      if (!logic || logic.type === 'continue') return null;
                      if (logic.type === 'end') return { action: 'end_survey' };
                      if (logic.type === 'jump') {
                        return {
                          action: 'jump',
                          targetType: 'section',
                          targetSectionId: logic.targetSectionId
                        };
                      }
                      if (logic.type === 'jump_to_question') {
                        return {
                          action: 'jump',
                          targetType: 'question',
                          targetQuestionId: logic.targetQuestionId
                        };
                      }
                      return null;
                    })()}
                    onChange={(newLogic) => {
                      if (!newLogic) {
                        handleLogicChange(option, { type: 'continue' });
                        return;
                      }
                      if (newLogic.action === 'end_survey') {
                        handleLogicChange(option, { type: 'end' });
                      } else if (
                        newLogic.action === 'jump' &&
                        newLogic.targetType === 'section'
                      ) {
                        handleLogicChange(option, {
                          type: 'jump',
                          targetSectionId: newLogic.targetSectionId
                        });
                      } else if (
                        newLogic.action === 'jump' &&
                        newLogic.targetType === 'question'
                      ) {
                        handleLogicChange(option, {
                          type: 'jump_to_question',
                          targetQuestionId: newLogic.targetQuestionId
                        });
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLogicTemplates = () => {
    const templates = [
      {
        id: "satisfaction_flow",
        name: "Satisfaction Flow",
        description: "Route satisfied users to testimonial, unsatisfied to feedback",
        icon: Target,
        apply: () => {
          // Apply logic template based on option patterns
          if (options.length >= 2) {
            // Assume first option is positive, last is negative
            handleLogicChange(options[0], { type: 'continue' });
            if (options.length > 2) {
              handleLogicChange(options[options.length - 1], { type: 'jump', targetSectionId: sections[sections.length - 1]?.id });
            }
          }
        }
      },
      {
        id: "screening_flow",
        name: "Screening Flow",
        description: "Route qualifying responses to main survey, others to end",
        icon: GitBranch,
        apply: () => {
          if (options.length >= 2) {
            handleLogicChange(options[0], { type: 'continue' });
            options.slice(1).forEach(option => {
              handleLogicChange(option, { type: 'end' });
            });
          }
        }
      }
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-700">Quick Setup Templates</h3>
        <div className="grid gap-3">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={template.apply}
                className="flex items-start gap-3 p-4 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{template.name}</h4>
                  <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLogicValidation = () => {
    const issues = [];
    const warnings = [];

    // Check for potential issues
    const endingPaths = options.filter(opt => {
      const logic = getOptionLogic?.(question.id, opt);
      return logic && logic.type === 'end';
    });

    if (endingPaths.length === options.length) {
      issues.push("All answer choices end the survey - respondents cannot continue");
    }

    if (logicAnalysis.hasLogic && logicAnalysis.logicPaths < logicAnalysis.totalPaths / 2) {
      warnings.push("Consider adding logic to more answer choices for better flow control");
    }

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700">Logic Validation</h3>

        {issues.length === 0 && warnings.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700">Logic setup looks good!</span>
          </div>
        )}

        {issues.map((issue, index) => (
          <div key={index} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
            <span className="text-sm text-red-700">{issue}</span>
          </div>
        ))}

        {warnings.map((warning, index) => (
          <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Info className="w-4 h-4 text-amber-600 mt-0.5" />
            <span className="text-sm text-amber-700">{warning}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!isChoiceQuestion) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled}>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Zap className="w-4 h-4" />
            Setup Logic
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-600" />
            Logic Setup - {question.title || "Untitled Question"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedView("overview")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                selectedView === "overview"
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Flow Overview
            </button>
            <button
              onClick={() => setSelectedView("templates")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                selectedView === "templates"
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Quick Templates
            </button>
            <button
              onClick={() => setSelectedView("validation")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                selectedView === "validation"
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Validation
            </button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto pr-2">
            <AnimatePresence mode="wait">
              {selectedView === "overview" && (
                <div key="overview">
                  {renderLogicFlowVisualization()}
                </div>
              )}
              {selectedView === "templates" && (
                <div key="templates">
                  {renderLogicTemplates()}
                </div>
              )}
              {selectedView === "validation" && (
                <div key="validation">
                  {renderLogicValidation()}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
