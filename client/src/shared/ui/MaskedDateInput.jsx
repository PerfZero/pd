import { useEffect, useState } from "react";
import { Input } from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const DEFAULT_FORMAT = "DD.MM.YYYY";

const formatMask = (raw) => {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  let formatted = day;
  if (month) formatted += `.${month}`;
  if (year) formatted += `.${year}`;

  return formatted;
};

const MaskedDateInput = ({
  value,
  onChange,
  format = DEFAULT_FORMAT,
  placeholder = "ДД.ММ.ГГГГ",
  ...rest
}) => {
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const handleChange = (event) => {
    const formatted = formatMask(event.target.value);
    setInputValue(formatted);

    if (!formatted) {
      onChange?.(null);
      return;
    }

    if (formatted.length === DEFAULT_FORMAT.length) {
      const parsed = dayjs(formatted, format, true);
      if (parsed.isValid()) {
        onChange?.(formatted);
      } else {
        onChange?.(formatted);
      }
    } else {
      onChange?.(formatted);
    }
  };

  return (
    <Input
      value={inputValue}
      placeholder={placeholder}
      onChange={handleChange}
      inputMode="numeric"
      {...rest}
    />
  );
};

export default MaskedDateInput;
