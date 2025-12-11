const weightImportance = 0.6;
const weightUrgency = 0.4;

export const computePriorityScore = (
  importance?: number,
  urgency?: number
): number | null => {
  if (
    importance === undefined ||
    urgency === undefined ||
    importance === null ||
    urgency === null
  ) {
    return null;
  }

  const importanceScore = Number(importance);
  const urgencyScore = Number(urgency);
  return Number(
    (importanceScore * weightImportance + urgencyScore * weightUrgency).toFixed(2)
  );
};

export const defaultPriorityLevel = 3;
