/** Client-visible debug surfaces (dev plan switcher, platform classification UI, etc.). */
export function isDebugPlatformClassificationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION === "true";
}
