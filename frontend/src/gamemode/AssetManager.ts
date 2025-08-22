export class AssetManager {
  private static readonly BASE_ASSET_PATH = '/assets/gameplan/pod-assets'
  private static readonly CHARACTER_PATH = '/2_Characters/Character_Generator/0_Premade_Characters/48x48'

  static getCharacterSpritePath(characterNumber: number): string {
    const paddedNumber = characterNumber.toString().padStart(2, '0')
    return `${this.BASE_ASSET_PATH}${this.CHARACTER_PATH}/Premade_Character_48x48_${paddedNumber}.png`
  }

  static getRandomCharacterSpritePath(): string {
    // Characters are numbered 01-20 based on the file listing
    const randomNumber = Math.floor(Math.random() * 20) + 1
    return this.getCharacterSpritePath(randomNumber)
  }

  static getAllCharacterNumbers(): number[] {
    return Array.from({ length: 20 }, (_, i) => i + 1)
  }
}