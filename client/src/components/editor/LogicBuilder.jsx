import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import {
  Plus,
  Trash2,
  Eye,
  Navigation,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from "lucide-react";

/**
 * Logic Builder Component
 * Create conditional visibility and navigation rules
 *
 * IMPORTANT: Changes are LOCAL DRAFTS until explicitly saved
 * User must click "Save Logic" to persist to database
 */
export function LogicBuilder({
  questions = [],
  sections = [],
  visibilityRules = [],
  navigationRules = [],
  onVisibilityRulesChange,
  onNavigationRulesChange,
  onSave, // Callback to trigger survey save
  onCancel, // Callback to revert changes
}) {
  const [expandedVis, setExpandedVis] = useState(new Set());
  const [expandedNav, setExpandedNav] = useState(new Set());

  // Local draft state - user edits update these
  const [draftVisibilityRules, setDraftVisibilityRules] =
    useState(visibilityRules);
  const [draftNavigationRules, setDraftNavigationRules] =
    useState(navigationRules);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync incoming rules when parent updates (e.g., after save)
  useEffect(() => {
    setDraftVisibilityRules(visibilityRules);
    setDraftNavigationRules(navigationRules);
    setHasUnsavedChanges(false);
  }, [visibilityRules, navigationRules]);

  const operators = [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "in", label: "Is One Of (for multi-select)" },
    { value: "not_in", label: "Is Not One Of" },
    { value: "gt", label: "Greater Than" },
    { value: "lt", label: "Less Than" },
    { value: "gte", label: "Greater Than or Equal" },
    { value: "lte", label: "Less Than or Equal" },
    { value: "contains", label: "Contains Text" },
    { value: "exists", label: "Is Answered" },
  ];

  const toggleVisRule = (ruleId) => {
    setExpandedVis((prev) => {
      const newSet = new Set(prev);
      newSet.has(ruleId) ? newSet.delete(ruleId) : newSet.add(ruleId);
      return newSet;
    });
    setHasUnsavedChanges(true);
  };

  const toggleNavRule = (ruleId) => {
    setExpandedNav((prev) => {
      const newSet = new Set(prev);
      newSet.has(ruleId) ? newSet.delete(ruleId) : newSet.add(ruleId);
      return newSet;
    });
    setHasUnsavedChanges(true);
  };

  const addVisibilityRule = () => {
    const newRule = {
      id: `vis_${crypto.randomUUID()}`,
      targetType: "question",
      targetId: questions[0]?.id || "",
      effect: "show",
      when: {
        questionId: questions[0]?.id || "",
        operator: "equals",
        value: "",
      },
      priority: 0,
    };
    setDraftVisibilityRules([...draftVisibilityRules, newRule]);
    setExpandedVis((prev) => new Set(prev).add(newRule.id));
    setHasUnsavedChanges(true);
  };

  const updateVisibilityRule = (ruleId, updates) => {
    setDraftVisibilityRules(
      draftVisibilityRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    );
    setHasUnsavedChanges(true);
  };

  const deleteVisibilityRule = (ruleId) => {
    setDraftVisibilityRules(
      draftVisibilityRules.filter((r) => r.id !== ruleId)
    );
    setHasUnsavedChanges(true);
  };

  const addNavigationRule = () => {
    const newRule = {
      id: `nav_${crypto.randomUUID()}`,
      fromSectionId: sections[0]?.id || null,
      when: {
        questionId: questions[0]?.id || "",
        operator: "equals",
        value: "",
      },
      action: {
        type: "jump",
        targetSectionId: sections[1]?.id || "",
      },
      priority: 0,
    };
    setDraftNavigationRules([...draftNavigationRules, newRule]);
    setExpandedNav((prev) => new Set(prev).add(newRule.id));
    setHasUnsavedChanges(true);
  };

  const updateNavigationRule = (ruleId, updates) => {
    setDraftNavigationRules(
      draftNavigationRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    );
    setHasUnsavedChanges(true);
  };

  const deleteNavigationRule = (ruleId) => {
    setDraftNavigationRules(
      draftNavigationRules.filter((r) => r.id !== ruleId)
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveLogic = () => {
    // Apply draft changes to parent state
    onVisibilityRulesChange(draftVisibilityRules);
    onNavigationRulesChange(draftNavigationRules);
    setHasUnsavedChanges(false);

    // Trigger survey save if callback provided
    if (onSave) {
      onSave();
    }
  };

  const handleCancelLogic = () => {
    // Revert to original prop values
    setDraftVisibilityRules(visibilityRules);
    setDraftNavigationRules(navigationRules);
    setHasUnsavedChanges(false);

    // Call parent cancel callback if provided
    if (onCancel) {
      onCancel();
    }
  };

  /**
   * Detect circular visibility dependencies
   * Returns array of warning messages
   */
  const detectCircularVisibility = () => {
    const warnings = [];
    const graph = new Map(); // questionId -> [dependent questionIds]

    // Build dependency graph
    draftVisibilityRules
      .filter((r) => r.targetType === "question")
      .forEach((rule) => {
        const source = rule.when?.questionId;
        const target = rule.targetId;
        if (source && target) {
          if (!graph.has(source)) graph.set(source, []);
          graph.get(source).push(target);
        }
      });

    // Check for cycles using DFS - must check each component separately
    const globalVisited = new Set();
    const cycles = new Set(); // Track unique cycles

    const findCycle = (start) => {
      const path = [];
      const recStack = new Set();

      const dfs = (node) => {
        if (recStack.has(node)) {
          // Found a cycle
          const cycleStart = path.indexOf(node);
          const cyclePath = [...path.slice(cycleStart), node];
          const cycleKey = cyclePath.sort().join("->");

          if (!cycles.has(cycleKey)) {
            cycles.add(cycleKey);
            const cycleNames = cyclePath.map(getQuestionTitle).join(" → ");
            warnings.push(
              `Circular visibility dependency: ${cycleNames}. This may cause questions to be hidden unexpectedly.`
            );
          }
          return;
        }

        if (globalVisited.has(node)) return;

        globalVisited.add(node);
        recStack.add(node);
        path.push(node);

        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
          dfs(neighbor);
        }

        path.pop();
        recStack.delete(node);
      };

      dfs(start);
    };

    // Check each node as potential cycle entry point
    graph.forEach((_, node) => {
      if (!globalVisited.has(node)) {
        findCycle(node);
      }
    });

    return warnings;
  };

  /**
   * Detect circular navigation jumps
   * Returns array of warning messages
   */
  const detectCircularNavigation = () => {
    const warnings = [];
    const graph = new Map(); // sectionId -> [{targetSectionId, condition}]

    // Build navigation graph from rules
    draftNavigationRules
      .filter((r) => r.action?.type === "jump" && r.action?.targetSectionId)
      .forEach((rule) => {
        const fromSection = rule.fromSectionId;
        const toSection = rule.action.targetSectionId;

        // Handle global rules (fromSectionId === null)
        if (fromSection === null) {
          // Global rules can trigger from any section
          sections.forEach((section) => {
            if (!graph.has(section.id)) graph.set(section.id, []);
            graph.get(section.id).push({
              target: toSection,
              condition: rule.when?.questionId || "always",
            });
          });
        } else {
          if (!graph.has(fromSection)) graph.set(fromSection, []);
          graph.get(fromSection).push({
            target: toSection,
            condition: rule.when?.questionId || "always",
          });
        }
      });

    // Check for cycles using DFS
    const globalVisited = new Set();
    const cycles = new Set();

    const findCycle = (start) => {
      const path = [];
      const recStack = new Set();

      const dfs = (node) => {
        if (recStack.has(node)) {
          // Found a cycle
          const cycleStart = path.indexOf(node);
          const cyclePath = [...path.slice(cycleStart), node];
          const cycleKey = cyclePath.sort().join("->");

          if (!cycles.has(cycleKey)) {
            cycles.add(cycleKey);
            const cycleNames = cyclePath
              .map((sId) => {
                const section = sections.find((s) => s.id === sId);
                return section?.title || "Untitled Section";
              })
              .join(" → ");
            warnings.push(
              `Circular navigation detected: ${cycleNames}. Respondents may get stuck in a loop.`
            );
          }
          return;
        }

        if (globalVisited.has(node)) return;

        globalVisited.add(node);
        recStack.add(node);
        path.push(node);

        const edges = graph.get(node) || [];
        for (const edge of edges) {
          dfs(edge.target);
        }

        path.pop();
        recStack.delete(node);
      };

      dfs(start);
    };

    // Check each section as potential cycle entry point
    graph.forEach((_, sectionId) => {
      if (!globalVisited.has(sectionId)) {
        findCycle(sectionId);
      }
    });

    return warnings;
  };

  /**
   * Validate rule targets exist
   */
  const validateRuleTargets = () => {
    const errors = [];

    // Check visibility rules
    draftVisibilityRules.forEach((rule) => {
      if (rule.targetType === "question") {
        const targetExists = questions.some((q) => q.id === rule.targetId);
        if (!targetExists) {
          errors.push(
            `Visibility rule targets non-existent question: ${rule.targetId}`
          );
        }
      }
      if (rule.targetType === "section") {
        const targetExists = sections.some((s) => s.id === rule.targetId);
        if (!targetExists) {
          errors.push(
            `Visibility rule targets non-existent section: ${rule.targetId}`
          );
        }
      }

      const sourceExists = questions.some(
        (q) => q.id === rule.when?.questionId
      );
      if (!sourceExists && rule.when?.questionId) {
        errors.push(
          `Visibility rule checks non-existent question: ${rule.when.questionId}`
        );
      }
    });

    // Check navigation rules
    draftNavigationRules.forEach((rule) => {
      if (rule.action?.type === "jump" && rule.action?.targetSectionId) {
        const targetExists = sections.some(
          (s) => s.id === rule.action.targetSectionId
        );
        if (!targetExists) {
          errors.push(
            `Navigation rule jumps to non-existent section: ${rule.action.targetSectionId}`
          );
        }
      }

      const sourceExists = questions.some(
        (q) => q.id === rule.when?.questionId
      );
      if (!sourceExists && rule.when?.questionId) {
        errors.push(
          `Navigation rule checks non-existent question: ${rule.when.questionId}`
        );
      }
    });

    return errors;
  };

  const getQuestionTitle = (qId) => {
    const q = questions.find((q) => q.id === qId);
    return q ? q.title || q.text || "Untitled Question" : "Select question...";
  };

  const getSectionTitle = (sId) => {
    const s = sections.find((s) => s.id === sId);
    return s ? s.title || "Untitled Section" : "Select section...";
  };

  const getVisibilitySummary = (rule) => {
    const targetName =
      rule.targetType === "question"
        ? getQuestionTitle(rule.targetId)
        : getSectionTitle(rule.targetId);
    const sourceQuestion = getQuestionTitle(rule.when?.questionId);
    const operator =
      operators.find((op) => op.value === rule.when?.operator)?.label ||
      rule.when?.operator;
    const value = rule.when?.value || "...";

    return `${rule.effect === "show" ? "Show" : "Hide"} ${rule.targetType} "${targetName}" when "${sourceQuestion}" ${operator} "${value}"`;
  };

  const getNavigationSummary = (rule) => {
    const sourceQuestion = getQuestionTitle(rule.when?.questionId);
    const operator =
      operators.find((op) => op.value === rule.when?.operator)?.label ||
      rule.when?.operator;
    const value = rule.when?.value || "...";

    if (rule.action?.type === "end") {
      return `End survey when "${sourceQuestion}" ${operator} "${value}"`;
    }

    const targetSection = getSectionTitle(rule.action?.targetSectionId);
    return `Jump to "${targetSection}" when "${sourceQuestion}" ${operator} "${value}"`;
  };

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">
            Add questions first to create conditional logic rules
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save/Cancel Controls - Sticky Header */}
      {hasUnsavedChanges && (
        <div className="sticky top-0 z-10 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Unsaved Logic Changes
                </p>
                <p className="text-xs text-amber-700">
                  Click "Save Logic" to persist these rules to the database
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelLogic}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveLogic}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4" />
                Save Logic
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Visibility Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <CardTitle>Conditional Visibility Rules</CardTitle>
            </div>
            <Button onClick={addVisibilityRule} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Visibility Rule
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Show or hide questions/sections based on answers
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {draftVisibilityRules.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No visibility rules yet
            </p>
          ) : (
            draftVisibilityRules.map((rule, index) => {
              const isExpanded = expandedVis.has(rule.id);
              const isComplete = rule.targetId && rule.when?.questionId;

              return (
                <Card key={rule.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">Rule {index + 1}</Badge>
                          {isComplete ? (
                            <Badge>Active</Badge>
                          ) : (
                            <Badge variant="secondary">Incomplete</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {getVisibilitySummary(rule)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVisRule(rule.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteVisibilityRule(rule.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Action</Label>
                          <Select
                            value={rule.effect}
                            onValueChange={(value) =>
                              updateVisibilityRule(rule.id, { effect: value })
                            }
                          >
                            <SelectTrigger className={"w-full"}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="show">Show</SelectItem>
                              <SelectItem value="hide">Hide</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Target Type</Label>
                          <Select
                            value={rule.targetType}
                            onValueChange={(value) =>
                              updateVisibilityRule(rule.id, {
                                targetType: value,
                                targetId: "",
                              })
                            }
                          >
                            <SelectTrigger className={"w-full"}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="question">Question</SelectItem>
                              <SelectItem value="section">Section</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {rule.targetType === "question"
                            ? "Question to Show/Hide"
                            : "Section to Show/Hide"}
                        </Label>
                        <Select
                          value={rule.targetId}
                          onValueChange={(value) =>
                            updateVisibilityRule(rule.id, { targetId: value })
                          }
                        >
                          <SelectTrigger className={"w-full"}>
                            <SelectValue
                              placeholder={`Select ${rule.targetType}...`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {rule.targetType === "question"
                              ? questions.map((q) => (
                                  <SelectItem key={q.id} value={q.id}>
                                    {q.title || q.text || "Untitled Question"}
                                  </SelectItem>
                                ))
                              : sections.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.title || "Untitled Section"}
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="border-t pt-4">
                        <Label className="mb-3 block">
                          When This Condition Is Met
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Question</Label>
                            <Select
                              value={rule.when?.questionId || ""}
                              onValueChange={(value) =>
                                updateVisibilityRule(rule.id, {
                                  when: { ...rule.when, questionId: value },
                                })
                              }
                            >
                              <SelectTrigger className={"w-full"}>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {questions
                                  .filter((q) => q.id !== rule.targetId)
                                  .map((q) => (
                                    <SelectItem key={q.id} value={q.id}>
                                      {q.title || q.text || "Untitled"}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Condition</Label>
                            <Select
                              value={rule.when?.operator || "equals"}
                              onValueChange={(value) =>
                                updateVisibilityRule(rule.id, {
                                  when: { ...rule.when, operator: value },
                                })
                              }
                            >
                              <SelectTrigger className={"w-full"}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Value</Label>
                            <Input
                              value={rule.when?.value || ""}
                              onChange={(e) =>
                                updateVisibilityRule(rule.id, {
                                  when: { ...rule.when, value: e.target.value },
                                })
                              }
                              placeholder={
                                rule.when?.operator === "exists"
                                  ? "Not required"
                                  : "Enter value..."
                              }
                              disabled={rule.when?.operator === "exists"}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Navigation Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              <CardTitle>Navigation Rules</CardTitle>
            </div>
            <Button
              onClick={addNavigationRule}
              disabled={sections.length < 2}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Navigation Rule
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Control survey flow with conditional jumps and early termination
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {sections.length < 2 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
              Create at least 2 sections to enable navigation rules
            </p>
          )}

          {draftNavigationRules.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No navigation rules yet
            </p>
          ) : (
            draftNavigationRules.map((rule, index) => {
              const isExpanded = expandedNav.has(rule.id);
              const isComplete =
                rule.when?.questionId &&
                (rule.action?.type === "end" || rule.action?.targetSectionId);

              return (
                <Card key={rule.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">Rule {index + 1}</Badge>
                          {isComplete ? (
                            <Badge>Active</Badge>
                          ) : (
                            <Badge variant="secondary">Incomplete</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {getNavigationSummary(rule)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleNavRule(rule.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNavigationRule(rule.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <Label className="mb-3 block">
                          When This Condition Is Met
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Question</Label>
                            <Select
                              value={rule.when?.questionId || ""}
                              onValueChange={(value) =>
                                updateNavigationRule(rule.id, {
                                  when: { ...rule.when, questionId: value },
                                })
                              }
                            >
                              <SelectTrigger className={"w-full"}>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {questions.map((q) => (
                                  <SelectItem key={q.id} value={q.id}>
                                    {q.title || q.text || "Untitled"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Condition</Label>
                            <Select
                              value={rule.when?.operator || "equals"}
                              onValueChange={(value) =>
                                updateNavigationRule(rule.id, {
                                  when: { ...rule.when, operator: value },
                                })
                              }
                            >
                              <SelectTrigger className={"w-full"}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Value</Label>
                            <Input
                              value={rule.when?.value || ""}
                              onChange={(e) =>
                                updateNavigationRule(rule.id, {
                                  when: { ...rule.when, value: e.target.value },
                                })
                              }
                              placeholder={
                                rule.when?.operator === "exists"
                                  ? "Not required"
                                  : "Enter value..."
                              }
                              disabled={rule.when?.operator === "exists"}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <Label className="mb-3 block">
                          Then Take This Action
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Action</Label>
                            <Select
                              value={rule.action?.type || "jump"}
                              onValueChange={(value) =>
                                updateNavigationRule(rule.id, {
                                  action: { ...rule.action, type: value },
                                })
                              }
                            >
                              <SelectTrigger className={"w-full"}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="jump">
                                  Jump to Section
                                </SelectItem>
                                <SelectItem value="end">End Survey</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {rule.action?.type === "jump" && (
                            <div className="space-y-2">
                              <Label className="text-xs">Target Section</Label>
                              <Select
                                value={rule.action?.targetSectionId || ""}
                                onValueChange={(value) =>
                                  updateNavigationRule(rule.id, {
                                    action: {
                                      ...rule.action,
                                      targetSectionId: value,
                                    },
                                  })
                                }
                              >
                                <SelectTrigger className={"w-full"}>
                                  <SelectValue placeholder="Select section..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {sections
                                    .filter((s) => s.id !== rule.fromSectionId)
                                    .map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.title || "Untitled Section"}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      {hasUnsavedChanges &&
        (() => {
          const circularWarnings = detectCircularVisibility();
          const navigationWarnings = detectCircularNavigation();
          const targetErrors = validateRuleTargets();

          if (
            targetErrors.length === 0 &&
            circularWarnings.length === 0 &&
            navigationWarnings.length === 0
          ) {
            return null;
          }

          return (
            <div className="space-y-3">
              {targetErrors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h4 className="text-sm font-semibold text-red-900 mb-2">
                    ⚠️ Invalid Rules Detected
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    {targetErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {circularWarnings.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                    ⚠️ Circular Visibility Dependencies Detected
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                    {circularWarnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-yellow-600 mt-2">
                    These may cause questions to be hidden unexpectedly. Review
                    your visibility logic carefully.
                  </p>
                </div>
              )}

              {navigationWarnings.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <h4 className="text-sm font-semibold text-orange-900 mb-2">
                    ⚠️ Circular Navigation Loops Detected
                  </h4>
                  <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                    {navigationWarnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-orange-600 mt-2">
                    Respondents may get stuck in infinite loops. The system will
                    automatically terminate after detecting a loop.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
