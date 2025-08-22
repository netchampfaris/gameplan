export class Time {
  private static deltaTime: number = 0

  static getDeltaTime(): number {
    return this.deltaTime
  }

  static setDeltaTime(dt: number): void {
    this.deltaTime = dt
  }
}