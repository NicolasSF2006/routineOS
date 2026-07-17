export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function calculateDurationMinutes(
  startTime: string,
  endTime: string,
): number {
  return Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime))
}
