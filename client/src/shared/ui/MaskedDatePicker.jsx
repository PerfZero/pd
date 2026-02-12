import { useEffect, useState } from "react";
import { DatePicker, Input } from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const DEFAULT_FORMAT = "DD.MM.YYYY";

const MaskedDatePicker = ({
  value,
  onChange,
  format = DEFAULT_FORMAT,
  placeholder = "ДД.ММ.ГГГГ",
  style,
  size,
  className,
  disabled,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    value ? dayjs(value).format(format) : "",
  );

  useEffect(() => {
    setInputValue(value ? dayjs(value).format(format) : "");
  }, [value, format]);

  const handleInputChange = (event) => {
    const raw = event.target.value || "";
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    let formatted = day;
    if (month) formatted += `.${month}`;
    if (year) formatted += `.${year}`;

    setInputValue(formatted);

    if (!formatted) {
      onChange?.(null);
      return;
    }

    if (formatted.length === DEFAULT_FORMAT.length) {
      const parsed = dayjs(formatted, format, true);
      if (parsed.isValid()) {
        onChange?.(parsed, parsed.format(format));
      }
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <Input
        value={inputValue}
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        style={style}
        inputMode="numeric"
        size={size}
        className={className}
        disabled={disabled}
      />
      <DatePicker
        {...rest}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={(date, dateString) => {
          onChange?.(date, dateString);
          setOpen(false);
        }}
        format={format}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default MaskedDatePicker;
