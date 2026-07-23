import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Quote,
  Undo2,
  Redo2,
  Check,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  getRichTextEditorBody,
  getRichTextFontSize,
  sanitizeRichTextHtml,
} from "../../lib/utils/richText";

function ToolbarBtn({ onMouseDown, title, disabled, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onMouseDown={onMouseDown}
          disabled={disabled}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

const FONT_SIZE_OPTIONS = [
  { label: "S", value: "2" },
  { label: "M", value: "3" },
  { label: "L", value: "4" },
  { label: "XL", value: "5" },
];
const FONT_SIZE_MAP = {
  "2": "0.875rem",
  "3": "1rem",
  "4": "1.125rem",
  "5": "1.25rem",
};
const FONT_SIZE_VALUE_MAP = {
  "0.875rem": "2",
  "1rem": "3",
  "1.125rem": "4",
  "1.25rem": "5",
};

export function MarkdownEditor({
  value = "",
  onChange,
  disabled = false,
  placeholder = "",
}) {
  const editorRef = useRef(null);
  const lastValueRef = useRef("");
  const savedRangeRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const initialEditorBody = useMemo(() => getRichTextEditorBody(value), [value]);
  const initialFontSize = useMemo(() => getRichTextFontSize(value), [value]);
  const [editorFontSize, setEditorFontSize] = useState(initialFontSize);
  const isEmpty =
    !initialEditorBody ||
    initialEditorBody === "<div><br></div>" ||
    initialEditorBody === "<p></p>";

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (initialEditorBody !== lastValueRef.current) {
      editor.innerHTML = initialEditorBody;
      lastValueRef.current = initialEditorBody;
    }

    if (initialFontSize !== editorFontSize) {
      setEditorFontSize(initialFontSize);
    }
  }, [editorFontSize, initialEditorBody, initialFontSize]);

  const saveCurrentRange = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const commonNode =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;

    if (!commonNode || !editor.contains(commonNode)) return;

    savedRangeRef.current = range.cloneRange();
  };

  const emitChange = (fontSizeOverride = editorFontSize) => {
    const editor = editorRef.current;
    if (!editor) return;

    const sanitizedBody = sanitizeRichTextHtml(editor.innerHTML);
    const safeFontSize = FONT_SIZE_MAP[FONT_SIZE_VALUE_MAP[fontSizeOverride]]
      ? fontSizeOverride
      : "1rem";
    const wrapperStyle =
      safeFontSize === "1rem" ? "" : ` style="font-size: ${safeFontSize}"`;
    const serializedValue = `<div data-editor-root="true"${wrapperStyle}>${sanitizedBody}</div>`;

    lastValueRef.current = sanitizedBody;
    onChange?.(serializedValue);
  };

  const findClosestTag = (node, tagName) => {
    const editor = editorRef.current;
    let current = node;

    while (current && current !== editor) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        if (current.tagName?.toLowerCase() === tagName) {
          return current;
        }
      }
      current = current.parentNode;
    }

    return null;
  };

  const getEditorSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return null;

    const liveRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const liveCommonNode = liveRange
      ? liveRange.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? liveRange.commonAncestorContainer.parentNode
        : liveRange.commonAncestorContainer
      : null;

    const activeRange =
      liveCommonNode && editor.contains(liveCommonNode)
        ? liveRange
        : savedRangeRef.current;

    if (!activeRange) return null;

    const commonNode =
      activeRange.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? activeRange.commonAncestorContainer.parentNode
        : activeRange.commonAncestorContainer;

    if (!commonNode || !editor.contains(commonNode)) return null;

    if (selection.rangeCount === 0 || selection.getRangeAt(0) !== activeRange) {
      selection.removeAllRanges();
      selection.addRange(activeRange);
    }

    return { editor, selection, range: activeRange };
  };

  const restoreSavedRange = () => {
    const selectionState = getEditorSelection();
    return selectionState;
  };

  const runCommand = (command, valueArg = null) => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, valueArg);
    saveCurrentRange();
    emitChange();
  };

  const normalizeLinkHref = (rawValue) => {
    const nextValue = String(rawValue || "").trim();
    if (!nextValue) return "";
    if (
      nextValue.startsWith("http://") ||
      nextValue.startsWith("https://") ||
      nextValue.startsWith("mailto:") ||
      nextValue.startsWith("tel:") ||
      nextValue.startsWith("/")
    ) {
      return nextValue;
    }
    return `https://${nextValue}`;
  };

  const getSelectedLink = () => {
    const selectionState = restoreSavedRange();
    if (!selectionState) return null;
    const { range } = selectionState;

    const anchorNode =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;

    return findClosestTag(anchorNode, "a");
  };

  const toggleLinkEditor = () => {
    if (disabled) return;
    saveCurrentRange();
    const selectedLink = getSelectedLink();
    setLinkValue(selectedLink?.getAttribute("href") || "");
    setIsLinkEditorOpen((open) => !open);
  };

  const applyLink = () => {
    if (disabled) return;
    const href = normalizeLinkHref(linkValue);
    if (!href) return;

    const selectionState = restoreSavedRange();
    if (!selectionState) return;

    const { editor, range } = selectionState;
    editor.focus();

    const selectedLink = getSelectedLink();
    if (selectedLink) {
      selectedLink.setAttribute("href", href);
      selectedLink.setAttribute("target", "_blank");
      selectedLink.setAttribute("rel", "noopener noreferrer");
      emitChange();
      setIsLinkEditorOpen(false);
      return;
    }

    if (range.collapsed) {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>`,
      );
    } else {
      document.execCommand("createLink", false, href);
      const createdLink = getSelectedLink();
      if (createdLink) {
        createdLink.setAttribute("target", "_blank");
        createdLink.setAttribute("rel", "noopener noreferrer");
      }
    }

    saveCurrentRange();
    emitChange();
    setIsLinkEditorOpen(false);
  };

  const removeLink = () => {
    if (disabled) return;
    restoreSavedRange();
    document.execCommand("unlink", false);
    saveCurrentRange();
    emitChange();
    setLinkValue("");
    setIsLinkEditorOpen(false);
  };

  const toggleQuote = () => {
    if (disabled) return;

    const selectionState = restoreSavedRange();
    if (!selectionState) return;

    const { range } = selectionState;
    const anchorNode =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;
    const blockquote = findClosestTag(anchorNode, "blockquote");

    if (!blockquote) {
      runCommand("formatBlock", "blockquote");
      return;
    }

    const parent = blockquote.parentNode;
    if (!parent) return;

    while (blockquote.firstChild) {
      parent.insertBefore(blockquote.firstChild, blockquote);
    }
    parent.removeChild(blockquote);
    saveCurrentRange();
    emitChange();
  };

  const handleFontSizeChange = (event) => {
    const nextFontSize = FONT_SIZE_MAP[event.target.value] || "1rem";
    setEditorFontSize(nextFontSize);

    const editor = editorRef.current;
    if (!editor) return;

    editor
      .querySelectorAll('[style*="font-size"]')
      .forEach((element) => {
        element.style.fontSize = "";
        if (!element.getAttribute("style")?.trim()) {
          element.removeAttribute("style");
        }
      });

    emitChange(nextFontSize);
  };

  const handleInput = () => {
    emitChange();
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    document.execCommand("insertText", false, text);
    emitChange();
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "overflow-hidden rounded-md border transition-colors focus-within:border-primary",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
        <ToolbarBtn
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("bold");
          }}
          title="Bold"
          disabled={disabled}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("italic");
          }}
          title="Italic"
          disabled={disabled}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("underline");
          }}
          title="Underline"
          disabled={disabled}
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <ToolbarBtn
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("insertUnorderedList");
          }}
          title="Bullet list"
          disabled={disabled}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("insertOrderedList");
          }}
          title="Numbered list"
          disabled={disabled}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onMouseDown={(event) => {
            event.preventDefault();
            toggleQuote();
          }}
          title="Toggle quote"
          disabled={disabled}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onMouseDown={(event) => {
            event.preventDefault();
            toggleLinkEditor();
          }}
          title="Add or edit link"
          disabled={disabled}
        >
          <Link className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <select
          className="h-8 min-w-14 rounded-md border border-transparent bg-transparent px-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground"
          value={FONT_SIZE_VALUE_MAP[editorFontSize] || "3"}
          onMouseDown={saveCurrentRange}
          onChange={handleFontSizeChange}
          disabled={disabled}
          title="Font size"
        >
          {FONT_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <ToolbarBtn
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("undo");
          }}
          title="Undo"
          disabled={disabled}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("redo");
          }}
          title="Redo"
          disabled={disabled}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        </div>
        {isLinkEditorOpen && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-2 py-2">
            <Input
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              placeholder="Paste or type a link"
              className="h-8 min-w-0 flex-1"
              disabled={disabled}
            />
            <ToolbarBtn
              onMouseDown={(event) => {
                event.preventDefault();
                applyLink();
              }}
              title="Apply link"
              disabled={disabled || !linkValue.trim()}
            >
              <Check className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onMouseDown={(event) => {
                event.preventDefault();
                removeLink();
              }}
              title="Remove link"
              disabled={disabled}
            >
              <X className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </div>
        )}

      <div className="relative min-h-28">
          {isEmpty && !isFocused && placeholder && (
            <div
              className="pointer-events-none absolute left-3 top-2.5 select-none leading-7 text-muted-foreground"
              style={{ fontSize: editorFontSize }}
            >
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={() => {
              setIsFocused(false);
              saveCurrentRange();
              emitChange();
            }}
            onFocus={() => {
              setIsFocused(true);
              saveCurrentRange();
            }}
            onKeyUp={saveCurrentRange}
            onMouseUp={saveCurrentRange}
            onPaste={handlePaste}
            className="markdown-editor-content min-h-28 px-3 py-2 outline-none"
            style={{ fontSize: editorFontSize }}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default MarkdownEditor;
