export const formatKig = (value) => {
  if (!value) return value;

  let kig = value.toUpperCase();
  kig = kig.replace(/[^A-Z0-9]/g, "");

  const letters = kig.replace(/[^A-Z]/g, "");
  const numbers = kig.replace(/[^0-9]/g, "");

  const limitedLetters = letters.slice(0, 2);
  const limitedNumbers = numbers.slice(0, 7);

  if (limitedLetters.length === 0) {
    return "";
  }
  if (limitedNumbers.length === 0) {
    return limitedLetters;
  }
  return `${limitedLetters} ${limitedNumbers}`;
};

export const normalizePhoneNumber = (value) => {
  if (!value) return value;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
};

export const normalizeKig = (value) => {
  if (!value) return value;
  return value.replace(/\s/g, "");
};

export const formatPatentNumber = (value) => {
  if (!value) return value;

  const cleaned = value.replace(/[^\d№]/g, "");
  const numbersOnly = cleaned.replace(/№/g, "");
  const limited = numbersOnly.slice(0, 12);

  if (limited.length === 0) {
    return "";
  }
  if (limited.length <= 2) {
    return limited;
  }

  return `${limited.slice(0, 2)} №${limited.slice(2)}`;
};

export const normalizePatentNumber = (value) => {
  if (!value) return value;
  return value.replace(/\s/g, "");
};

export const normalizeRussianPassportNumber = (value) => {
  if (!value) return value;
  return value.replace(/[\s№]/g, "");
};
