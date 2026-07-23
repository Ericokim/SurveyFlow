import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const TruncatedCell = React.memo(
  ({ text, maxWidth = 320, className = "" }) => {
    const textRef = React.useRef(null);
    const [isTruncated, setIsTruncated] = React.useState(false);
    const value = text == null ? "" : String(text);

    React.useEffect(() => {
      if (textRef.current) {
        const { scrollWidth, clientWidth } = textRef.current;
        setIsTruncated(scrollWidth > clientWidth);
      }
    }, [value, maxWidth]);

    const content = (
      <div
        ref={textRef}
        className={cn("truncate", className, isTruncated && "cursor-pointer")}
        style={{ maxWidth: `${maxWidth}px` }}
      >
        {value}
      </div>
    );

    if (!isTruncated) {
      return <div className="flex items-center min-w-0">{content}</div>;
    }

    return (
      <div className="flex items-center min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[36rem] break-words">
            {value}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }
);

TruncatedCell.displayName = "TruncatedCell";

export default TruncatedCell;
