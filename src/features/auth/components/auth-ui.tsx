import { useMemo, useState } from "react";
import { Controller, type Control, type FieldError as RHFFieldError, type FieldValues, type Path, type UseFormRegisterReturn } from "react-hook-form";
import PhoneInputWithCountry, { getCountryCallingCode, type Country } from "react-phone-number-input";
import en from "react-phone-number-input/locale/en.json";
import { getExampleNumber } from "libphonenumber-js";
import examplePhoneNumbers from "libphonenumber-js/examples.mobile.json";
import getUnicodeFlagIcon from "country-flag-icons/unicode";
import { Check, ChevronsUpDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const authFieldLabelClass = "text-[13px] font-semibold text-foreground/80";
export const authInputClass =
    "h-auto rounded-[10px] border-[1.5px] border-input bg-[oklch(0.995_0.002_85)] px-3.5 py-[11px] text-[14.5px] text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-[3px] focus-visible:ring-ring/25";
export const authOtpBoxClass =
    "aspect-square h-auto w-full rounded-[10px] border-[1.5px] border-input bg-[oklch(0.995_0.002_85)] p-0 text-center text-xl font-bold text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25";
export const authLinkClass = "font-semibold text-primary underline-offset-4 hover:underline";
export const authBackLinkClass =
    "group -ml-2 mb-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
export const authPrimaryButtonClass = "mt-6 h-auto min-h-[46px] w-full rounded-[10px] text-[15px] font-semibold";

interface AuthSubmitButtonProps {
    pending: boolean;
    label: string;
    pendingLabel: string;
    className?: string;
}

export const AuthSubmitButton = ({ pending, label, pendingLabel, className }: AuthSubmitButtonProps) => (
    <Button type="submit" disabled={pending} className={cn(authPrimaryButtonClass, className)}>
        {pending ? (
            <>
                <Loader2 className="size-[18px] animate-spin" aria-hidden="true" />
                <span className="sr-only">{pendingLabel}</span>
            </>
        ) : (
            label
        )}
    </Button>
);

interface PasswordFieldProps {
    id: string;
    label: string;
    autoComplete: string;
    placeholder?: string;
    registration: UseFormRegisterReturn;
    error?: RHFFieldError;
    hideLabel?: boolean;
}

export const PasswordField = ({
    id,
    label,
    autoComplete,
    placeholder,
    registration,
    error,
    hideLabel,
}: PasswordFieldProps) => {
    const [show, setShow] = useState(false);

    return (
        <Field data-invalid={!!error}>
            {!hideLabel && (
                <FieldLabel htmlFor={id} className={authFieldLabelClass}>
                    {label}
                </FieldLabel>
            )}
            <div className="relative">
                <Input
                    id={id}
                    type={show ? "text" : "password"}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    aria-invalid={!!error}
                    className={cn(authInputClass, "pr-11")}
                    {...registration}
                />
                <button
                    type="button"
                    onClick={() => setShow((value) => !value)}
                    className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                >
                    <span className="sr-only">{show ? "Hide password" : "Show password"}</span>
                    {show ? (
                        <EyeOff className="size-[18px]" aria-hidden="true" />
                    ) : (
                        <Eye className="size-[18px]" aria-hidden="true" />
                    )}
                </button>
            </div>
            <div className="min-h-5">
                <FieldError errors={[error]} />
            </div>
        </Field>
    );
};

interface CountrySelectOption {
    value?: Country;
    label: string;
    divider?: boolean;
}

interface CountrySelectFieldProps {
    value?: Country;
    onChange: (value?: Country) => void;
    options: CountrySelectOption[];
    disabled?: boolean;
    "aria-label"?: string;
}

const CountrySelectField = ({ value, onChange, options, disabled, "aria-label": ariaLabel }: CountrySelectFieldProps) => {
    const [open, setOpen] = useState(false);

    const countryOptions = useMemo(
        () => options.filter((option): option is CountrySelectOption & { value: Country } => !option.divider && !!option.value),
        [options],
    );
    const selected = countryOptions.find((option) => option.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    aria-label={ariaLabel}
                    className={cn(authInputClass, "md:text-sm flex w-[104px] shrink-0 cursor-pointer items-center justify-between gap-1")}
                >
                    <span className="flex min-w-0 items-center gap-1 truncate">
                        {selected ? (
                            <>
                                <span className="text-xl leading-none" aria-hidden="true">
                                    {getUnicodeFlagIcon(selected.value)}
                                </span>
                                <span>+{getCountryCallingCode(selected.value)}</span>
                            </>
                        ) : (
                            "Select"
                        )}
                    </span>
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
                <Command>
                    <CommandInput placeholder="Search country or code…" />
                    <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                            {countryOptions.map((option) => {
                                const callingCode = getCountryCallingCode(option.value);
                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        keywords={[option.label, `+${callingCode}`, option.value]}
                                        data-checked={option.value === value}
                                        onSelect={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <span aria-hidden="true">{getUnicodeFlagIcon(option.value)}</span>
                                        <span className="flex-1 truncate">{option.label}</span>
                                        <span className="text-muted-foreground">+{callingCode}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const DEFAULT_PHONE_COUNTRY: Country = "US";
const DEFAULT_PHONE_PLACEHOLDER = "555 123 4567";

const getPhonePlaceholder = (country?: Country) => {
    if (!country) return DEFAULT_PHONE_PLACEHOLDER;
    const example = getExampleNumber(country, examplePhoneNumbers);
    return example ? example.formatNational() : DEFAULT_PHONE_PLACEHOLDER;
};

interface PhoneNumberFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: Path<T>;
    error?: RHFFieldError;
}

export const PhoneNumberField = <T extends FieldValues>({ control, name, error }: PhoneNumberFieldProps<T>) => {
    const [country, setCountry] = useState<Country | undefined>(DEFAULT_PHONE_COUNTRY);
    const placeholder = useMemo(() => getPhonePlaceholder(country), [country]);

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <PhoneInputWithCountry
                    className="flex gap-2"
                    defaultCountry={DEFAULT_PHONE_COUNTRY}
                    labels={en}
                    addInternationalOption={false}
                    countrySelectComponent={CountrySelectField}
                    countrySelectProps={{ "aria-label": "Country code" }}
                    inputComponent={Input}
                    numberInputProps={{
                        id: "phone",
                        placeholder,
                        autoComplete: "tel",
                        "aria-invalid": !!error,
                        className: authInputClass,
                    }}
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? "")}
                    onCountryChange={setCountry}
                    onBlur={field.onBlur}
                />
            )}
        />
    );
};

interface AuthSuccessScreenProps {
    title: string;
    subtitle: string;
    onContinue: () => void;
}

export const AuthSuccessScreen = ({ title, subtitle, onContinue }: AuthSuccessScreenProps) => (
    <div className="animate-[sw-fade-in_0.35s_ease] py-5 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-[oklch(0.72_0.17_145_/_0.14)]">
            <Check className="size-6 text-[oklch(0.5_0.16_145)]" strokeWidth={3} aria-hidden="true" />
        </div>
        <div className="mb-2 text-2xl font-bold tracking-tight">{title}</div>
        <div className="mb-7 text-[14.5px] leading-relaxed text-muted-foreground">{subtitle}</div>
        <Button type="button" onClick={onContinue} className={authPrimaryButtonClass}>
            Continue to sign in
        </Button>
    </div>
);
