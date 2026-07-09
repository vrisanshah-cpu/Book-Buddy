"use client";

import type { ReactNode } from "react";
import { Children, isValidElement } from "react";

export interface ParentChildProfileData {
  id: string;
  display_name: string;
  username?: string | null;
  age?: number | null;
}

/** Nest inside ParentSettingsClient / ParentBooksClient to pass child profile data. */
export function ParentChildProfile(_props: ParentChildProfileData) {
  return null;
}

export function collectParentChildProfiles(
  nodes: ReactNode
): ParentChildProfileData[] {
  const profiles: ParentChildProfileData[] = [];

  Children.forEach(nodes, (node) => {
    if (isValidElement(node) && node.type === ParentChildProfile) {
      profiles.push(node.props as ParentChildProfileData);
    }
  });

  return profiles;
}
