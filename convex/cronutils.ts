// Functions for parsing cron strings.

function isValidCron(cronspec: string): boolean {
  const fields: string[] = cronspec.split(/\s+/);
  if (fields.length !== 5) {
    return false;
  }

  // Define the ranges for minute, hour, day of month, month, and day of week fields
  const ranges: { [key: string]: [number, number] } = {
    minute: [0, 59],
    hour: [0, 23],
    dayOfMonth: [1, 31],
    month: [1, 12], // Cron months go from 1 to 12
    dayOfWeek: [0, 7], // Cron days go from 0 (Sunday) to 7 (Sunday), 7 is the same as 0
  };

  return fields.every((field, index) => {
    const range = ranges[Object.keys(ranges)[index]];
    return isValidField(field, range);
  });
}

function isValidField(field: string, [min, max]: [number, number]): boolean {
  // Check for direct match (e.g., '*')
  if (field === "*") return true;

  // Check for lists (e.g., '1,3,5')
  const listMatches: string[] = field.split(",");
  if (listMatches.every((value) => isValidField(value, [min, max]))) {
    return true;
  }

  // Check for ranges (e.g., '1-3')
  const rangeMatches: string[] = field.split("-");
  if (rangeMatches.length === 2) {
    const [rangeStart, rangeEnd]: number[] = rangeMatches.map(Number);
    return rangeStart >= min && rangeEnd <= max && rangeStart <= rangeEnd;
  }

  // Check for step values (e.g., '*/10')
  if (field.startsWith("*/")) {
    const step: number = Number(field.slice(2));
    return !isNaN(step) && step >= min && step <= max;
  }

  // Validate single number
  const value: number = Number(field);
  return !isNaN(value) && value >= min && value <= max;
}
