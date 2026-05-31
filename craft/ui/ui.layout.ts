/**
 * @keywords    grid, flex, layout, container, responsive, breakpoint, column, row, sidebar, wrapper, stack
 * @domain      UI Layout
 * @use-when    Building page structure, responsive grids, container widths, or flex/stack layouts
 * @not-when    You need component-level styling — use ui.tokens.ts for spacing values instead
 */

import React, { ReactNode, HTMLAttributes, CSSProperties } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";
type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";
type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

// ─── Breakpoint Config ────────────────────────────────────────────────────────

export const breakpoints: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = React.useState<Breakpoint>("sm");

  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= breakpoints["2xl"]) setBp("2xl");
      else if (w >= breakpoints.xl) setBp("xl");
      else if (w >= breakpoints.lg) setBp("lg");
      else if (w >= breakpoints.md) setBp("md");
      else setBp("sm");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return bp;
}

export function useIsAbove(bp: Breakpoint): boolean {
  const current = useBreakpoint();
  const bpOrder: Breakpoint[] = ["sm", "md", "lg", "xl", "2xl"];
  return bpOrder.indexOf(current) >= bpOrder.indexOf(bp);
}

// ─── Container ────────────────────────────────────────────────────────────────

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "prose";
  center?: boolean;
  padded?: boolean;
}

const containerMaxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  full: "max-w-full",
  prose: "max-w-prose",
};

export const Container: React.FC<ContainerProps> = ({
  maxWidth = "xl",
  center = true,
  padded = true,
  className = "",
  children,
  ...props
}) => (
  <div
    className={`w-full ${containerMaxWidthMap[maxWidth]} ${center ? "mx-auto" : ""} ${padded ? "px-4 sm:px-6 lg:px-8" : ""} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// ─── Stack (Vertical / Horizontal flex container) ─────────────────────────────

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "col";
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  divider?: ReactNode;
}

const gapMap: Record<Gap, string> = {
  0: "gap-0", 1: "gap-1", 2: "gap-2", 3: "gap-3",
  4: "gap-4", 5: "gap-5", 6: "gap-6", 8: "gap-8",
  10: "gap-10", 12: "gap-12", 16: "gap-16",
};

const alignMap: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyMap: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

export const Stack: React.FC<StackProps> = ({
  direction = "col",
  gap = 4,
  align = "stretch",
  justify = "start",
  wrap = false,
  divider,
  className = "",
  children,
  ...props
}) => {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <div
      className={`flex ${direction === "col" ? "flex-col" : "flex-row"} ${gapMap[gap]} ${alignMap[align]} ${justifyMap[justify]} ${wrap ? "flex-wrap" : ""} ${className}`}
      {...props}
    >
      {divider
        ? items.map((child, i) => (
            <React.Fragment key={i}>
              {child}
              {i < items.length - 1 && divider}
            </React.Fragment>
          ))
        : children}
    </div>
  );
};

// ─── Grid ─────────────────────────────────────────────────────────────────────

interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: number | Partial<Record<Breakpoint, number>>;
  gap?: Gap;
  rowGap?: Gap;
  colGap?: Gap;
}

function buildGridColsClass(cols: number | Partial<Record<Breakpoint, number>>): string {
  if (typeof cols === "number") {
    const map: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6", 12: "grid-cols-12" };
    return map[cols] ?? `grid-cols-${cols}`;
  }
  return Object.entries(cols)
    .map(([bp, n]) => {
      const prefix = bp === "sm" ? "sm:" : bp === "md" ? "md:" : bp === "lg" ? "lg:" : bp === "xl" ? "xl:" : "2xl:";
      return `${prefix}grid-cols-${n}`;
    })
    .join(" ");
}

export const Grid: React.FC<GridProps> = ({
  cols = 1,
  gap = 4,
  rowGap,
  colGap,
  className = "",
  children,
  ...props
}) => (
  <div
    className={`grid ${buildGridColsClass(cols)} ${!rowGap && !colGap ? gapMap[gap] : ""} ${rowGap ? `row-gap-${rowGap}` : ""} ${colGap ? `col-gap-${colGap}` : ""} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Grid item with span control
interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  colSpan?: number | Partial<Record<Breakpoint, number>>;
  rowSpan?: number;
  colStart?: number;
}

export const GridItem: React.FC<GridItemProps> = ({
  colSpan,
  rowSpan,
  colStart,
  className = "",
  children,
  ...props
}) => {
  const spanClass = colSpan
    ? typeof colSpan === "number"
      ? `col-span-${colSpan}`
      : Object.entries(colSpan).map(([bp, n]) => `${bp === "sm" ? "sm:" : bp === "md" ? "md:" : bp === "lg" ? "lg:" : "xl:"}col-span-${n}`).join(" ")
    : "";

  return (
    <div
      className={`${spanClass} ${rowSpan ? `row-span-${rowSpan}` : ""} ${colStart ? `col-start-${colStart}` : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// ─── Sidebar Layout ───────────────────────────────────────────────────────────

interface SidebarLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  sidebarWidth?: string;
  sidebarPosition?: "left" | "right";
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  sidebar,
  main,
  sidebarWidth = "256px",
  sidebarPosition = "left",
  collapsible = false,
  defaultCollapsed = false,
  className = "",
}) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const sidebarEl = (
    <aside
      style={{ width: collapsed ? 0 : sidebarWidth, minWidth: collapsed ? 0 : sidebarWidth }}
      className={`flex-shrink-0 overflow-hidden transition-all duration-300 ${collapsed ? "opacity-0" : "opacity-100"}`}
      aria-hidden={collapsed}
    >
      {sidebar}
    </aside>
  );

  return (
    <div className={`flex h-full w-full overflow-hidden ${className}`}>
      {sidebarPosition === "left" && sidebarEl}
      <main className="flex-1 overflow-auto min-w-0">
        {collapsible && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        )}
        {main}
      </main>
      {sidebarPosition === "right" && sidebarEl}
    </div>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────────────

interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = "horizontal",
  label,
  className = "",
  ...props
}) => {
  if (orientation === "vertical") {
    return <div className={`w-px bg-gray-200 self-stretch ${className}`} role="separator" aria-orientation="vertical" />;
  }

  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>
        <hr className="flex-1 border-gray-200" />
      </div>
    );
  }

  return <hr className={`border-gray-200 ${className}`} role="separator" {...props} />;
};

// ─── Spacer ───────────────────────────────────────────────────────────────────

interface SpacerProps {
  size?: Gap;
  axis?: "horizontal" | "vertical" | "both";
}

export const Spacer: React.FC<SpacerProps> = ({ size = 4, axis = "vertical" }) => {
  const px = size * 4; // tailwind spacing unit = 4px
  const style: CSSProperties = {
    display: "block",
    width: axis !== "vertical" ? px : undefined,
    height: axis !== "horizontal" ? px : undefined,
    minWidth: axis !== "vertical" ? px : undefined,
    minHeight: axis !== "horizontal" ? px : undefined,
  };
  return <span aria-hidden style={style} />;
};

/*
 * Usage Examples:
 *
 * // Responsive 3-col grid that becomes 1-col on mobile
 * <Grid cols={{ sm: 1, md: 2, lg: 3 }} gap={6}>
 *   <GridItem colSpan={{ lg: 2 }}>Wide content</GridItem>
 *   <GridItem>Normal</GridItem>
 * </Grid>
 *
 * // Sidebar layout with collapsible nav
 * <SidebarLayout
 *   sidebar={<NavMenu />}
 *   main={<PageContent />}
 *   collapsible
 *   sidebarWidth="240px"
 * />
 *
 * // Vertical stack with divider between items
 * <Stack direction="col" gap={4} divider={<Divider />}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 * </Stack>
 */
