"use client";
import { useMediaQuery } from "usehooks-ts";

/**
 * Screen size breakpoints in pixels
 * These values define the width thresholds for different device categories
 * - MOBILE: Maximum width for mobile devices
 * - TABLET: Maximum width for tablet devices (also used as minimum for non-mobile)
 * - DESKTOP: Minimum width for desktop devices (same as tablet max currently)
 * - LARGE_DESKTOP: Minimum width for large desktop displays
 */
export const BREAKPOINTS = {
  MOBILE: 640, // Devices smaller than 640px are considered small
  TABLET: 768, // Devices smaller than 768px are considered mobile
  DESKTOP: 1024, // Devices between 768px and 1024px are considered tablets
  LARGE_DESKTOP: 1280, // Devices larger than 1280px are considered large desktops
} as const;

/**
 * Media queries based on breakpoints
 * These queries use the BREAKPOINTS constants to create standardized media query strings
 * - MOBILE: Targets devices with maximum width of MOBILE breakpoint
 * - TABLET: Targets devices between MOBILE and TABLET breakpoints
 * - DESKTOP: Targets devices with minimum width of DESKTOP breakpoint
 * - LARGE_DESKTOP: Targets devices with minimum width of LARGE_DESKTOP breakpoint
 */
export const MEDIA_QUERIES = {
  MOBILE: `(max-width: ${BREAKPOINTS.MOBILE}px)`,
  TABLET: `(min-width: ${BREAKPOINTS.MOBILE}px)`,
  DESKTOP: `(min-width: ${BREAKPOINTS.DESKTOP}px)`,
  LARGE_DESKTOP: `(min-width: ${BREAKPOINTS.LARGE_DESKTOP}px)`,
} as const;

/**
 * Device detection hook based on media queries
 * This hook provides boolean flags for different device types based on screen width
 * It automatically updates when the viewport size changes
 *
 * @returns {Object} Device type boolean indicators
 * @returns {boolean} isMobile - True if viewport width is less than or equal to MOBILE breakpoint
 * @returns {boolean} isTablet - True if viewport width is between MOBILE and TABLET breakpoints
 * @returns {boolean} isDesktop - True if viewport width is greater than or equal to DESKTOP breakpoint
 * @returns {boolean} isLargeDesktop - True if viewport width is greater than or equal to LARGE_DESKTOP breakpoint
 *
 * @example
 * // In a component:
 * const { isMobile, isTablet, isDesktop } = useDeviceDetectMediaQuery();
 *
 * return (
 *   <div>
 *     {isMobile && <MobileLayout />}
 *     {isTablet && <TabletLayout />}
 *     {isDesktop && <DesktopLayout />}
 *   </div>
 * );
 */
export function useDeviceDetectMediaQuery() {
  // Check if current viewport matches each media query
  const isMobile = useMediaQuery(MEDIA_QUERIES.MOBILE);
  const isTablet = useMediaQuery(MEDIA_QUERIES.TABLET);
  const isDesktop = useMediaQuery(MEDIA_QUERIES.DESKTOP);
  const isLargeDesktop = useMediaQuery(MEDIA_QUERIES.LARGE_DESKTOP);

  return { isMobile, isTablet, isDesktop, isLargeDesktop };
}
