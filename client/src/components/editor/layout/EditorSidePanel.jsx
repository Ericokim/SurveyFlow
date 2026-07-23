import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { cn } from "../../../lib/utils";

/**
 * EditorSidePanel
 * Contextual settings panel that slides in from the right
 * Shows section or question settings based on selection
 */
export function EditorSidePanel({ isOpen, onClose, selectedEntity, children }) {
  if (!isOpen || !selectedEntity) return null;

  const isSection = selectedEntity.type === "section";
  const title = isSection ? "Section Settings" : "Question Settings";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full sm:w-96 bg-white border-l shadow-xl z-50",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-xs text-muted-foreground">
              {selectedEntity.title || selectedEntity.name || "Untitled"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-73px)]">{children}</div>
      </div>
    </>
  );
}

/**
 * EditorSidePanelContent
 * Tabbed content for settings, logic, and validation
 */
export function EditorSidePanelContent({
  isSection,
  settingsContent,
  logicContent,
  validationContent,
}) {
  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="logic">Logic</TabsTrigger>
        {!isSection && <TabsTrigger value="validation">Validation</TabsTrigger>}
      </TabsList>

      <div className="p-4">
        <TabsContent value="settings" className="mt-0">
          {settingsContent}
        </TabsContent>

        <TabsContent value="logic" className="mt-0">
          {logicContent}
        </TabsContent>

        {!isSection && (
          <TabsContent value="validation" className="mt-0">
            {validationContent}
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
