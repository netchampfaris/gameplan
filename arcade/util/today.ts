/**
 * The player's "today" as `YYYY-MM-DD` in their local time. An Arcade day starts at
 * local midnight, as in Wordle, so daily features (the plant, the puzzle, darts) send
 * this with each request. The server accepts it only within one day of its UTC date
 * (`player_today` in `gameplan/arcade.py`).
 */
export function localDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
