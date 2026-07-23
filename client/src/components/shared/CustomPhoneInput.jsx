import * as React from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Pv from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const normalizePhoneValue = (rawValue, country) => {
  if (!rawValue) return "";

  let value = String(rawValue).trim();

  if (value.startsWith("+")) return value;

  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return value;

  let countryCode = null;
  try {
    if (country) {
      countryCode = RPNInput.getCountryCallingCode(country);
    }
  } catch (error) {
    console.warn("Failed to derive country calling code", error);
    countryCode = null;
  }

  if (countryCode && digits.startsWith(countryCode)) {
    return `+${digits}`;
  }

  if (countryCode && /^0\d{5,}$/.test(digits)) {
    return `+${countryCode}${digits.slice(1)}`;
  }

  if (/^\d{7,}$/.test(digits)) {
    return `+${digits}`;
  }

  return value;
};

const PhoneInput = React.forwardRef(
  (
    {
      className,
      onChange,
      countries,
      defaultCountry = "KE",
      fieldState = {},
      value,
      ...props
    },
    ref
  ) => {
    const countriesToUse =
      Array.isArray(countries) && countries.length > 0
        ? countries
        : RPNInput.getCountries();

    const [currentCountry, setCurrentCountry] = React.useState(
      defaultCountry || "KE"
    );

    const safeValue = value ?? "";

    const handleChange = (rawValue) => {
      const normalized = normalizePhoneValue(
        rawValue || "",
        currentCountry || defaultCountry || "KE"
      );
      onChange?.(normalized || "");
    };

    const TrackedCountrySelect = (selectProps) => (
      <CountrySelect
        {...selectProps}
        onChange={(country) => {
          setCurrentCountry(country);
          if (selectProps.onChange) {
            selectProps.onChange(country);
          }
        }}
      />
    );

    return (
      <div
        className={cn(
          "flex rounded-md h-10 border bg-transparent transition-colors duration-200 focus-within:ring-0 focus-within:shadow-none",
          fieldState.error
            ? "border-destructive"
            : !fieldState.error && safeValue
              ? "border-primary"
              : "border-input",
          className
        )}
      >
        <RPNInput.default
          ref={ref}
          className={cn("flex w-full", className)}
          flagComponent={FlagComponent}
          countrySelectComponent={TrackedCountrySelect}
          inputComponent={InputComponent}
          onChange={handleChange}
          value={safeValue}
          countries={countriesToUse}
          defaultCountry={defaultCountry || "KE"}
          {...props}
        />
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      "rounded-e-md rounded-s-none px-3 border-0 focus:ring-0 focus-visible:ring-0 shadow-none h-full",
      className
    )}
    {...props}
  />
));
InputComponent.displayName = "InputComponent";

const CountrySelect = ({ disabled, value, onChange, options }) => {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchInputRef = React.useRef(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) {
      return options.filter((option) => option && option.value);
    }
    return options.filter((option) => {
      if (!option || !option.value || !option.label) return false;

      try {
        const countryCode = RPNInput.getCountryCallingCode(option.value);
        return (
          option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (countryCode && countryCode.includes(searchQuery))
        );
      } catch (error) {
        console.warn(`Invalid country code: ${option.value}`, error);
        return option.label.toLowerCase().includes(searchQuery.toLowerCase());
      }
    });
  }, [options, searchQuery]);

  const handleSelect = React.useCallback(
    (country) => {
      onChange(country);
      setOpen(false);
      setSearchQuery("");
    },
    [onChange]
  );

  const handleItemClick = React.useCallback(
    (event, country) => {
      event.preventDefault();
      event.stopPropagation();
      handleSelect(country);
    },
    [handleSelect]
  );

  const handleSearchChange = React.useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setSearchQuery(event.target.value);
  }, []);

  React.useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <Pv.Popover open={open} onOpenChange={setOpen}>
      <Pv.PopoverTrigger asChild>
        <Button
          type="button"
          role="combobox"
          variant="outline"
          className={cn(
            "flex rounded-e-none h-full rounded-s-md px-3 border-0 shadow-none focus:ring-0 focus-visible:ring-0",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <FlagComponent country={value || "KE"} countryName={value || "KE"} />
          <CaretSortIcon
            className={cn(
              "-mr-2 size-4 opacity-50 shrink-0",
              disabled ? "hidden" : "opacity-50"
            )}
          />
        </Button>
      </Pv.PopoverTrigger>
      <Pv.PopoverContent
        className="w-75 p-0 z-60"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-col max-h-75">
          <div className="p-3 border-b bg-background sticky top-0 z-10">
            <input
              ref={searchInputRef}
              className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-0 focus:border-primary transition-colors"
              placeholder="Search country..."
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onClick={(event) => event.stopPropagation()}
              onFocus={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent rounded-md transition-colors duration-150 focus:bg-accent focus:outline-none",
                      option.value === value &&
                        "bg-accent border border-primary/20"
                    )}
                    onClick={(event) => handleItemClick(event, option.value)}
                    onMouseDown={(event) => event.preventDefault()}
                    role="option"
                    tabIndex={0}
                    aria-selected={option.value === value}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleItemClick(event, option.value);
                      }
                    }}
                  >
                    <FlagComponent
                      country={option.value}
                      countryName={option.label}
                    />
                    <span className="flex-1 text-sm font-medium min-w-0 truncate">
                      {option.label}
                    </span>
                    <span className="text-muted-foreground text-sm ">
                      +
                      {(() => {
                        try {
                          return (
                            RPNInput.getCountryCallingCode(option.value) || ""
                          );
                        } catch (error) {
                          console.warn(
                            `Invalid country code: ${option.value}`,
                            error
                          );
                          return "";
                        }
                      })()}
                    </span>
                    <CheckIcon
                      className={cn(
                        "ml-1 size-4 shrink-0",
                        option.value === value
                          ? "opacity-100 text-primary"
                          : "opacity-0"
                      )}
                    />
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No countries found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      </Pv.PopoverContent>
    </Pv.Popover>
  );
};

CountrySelect.displayName = "CountrySelect";

const FlagComponent = ({ country, countryName }) => {
  const Flag = flags[country];
  return (
    <span className="flex h-4 w-6 items-center justify-center overflow-hidden rounded-sm border border-slate-200 bg-white">
      {Flag && <Flag title={countryName} className="h-4 w-6" />}
    </span>
  );
};
FlagComponent.displayName = "FlagComponent";

export { PhoneInput };
