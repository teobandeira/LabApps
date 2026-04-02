"use client";

import { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
};

const roundedMap: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

export default function Skeleton({
  className = "",
  rounded = "xl",
  ...props
}: SkeletonProps) {
  const roundedClass = roundedMap[rounded];
  return (
    <div
      className={`animate-pulse bg-slate-300/60 dark:bg-gray-700/70 ${roundedClass} ${className}`.trim()}
      {...props}
    />
  );
}
