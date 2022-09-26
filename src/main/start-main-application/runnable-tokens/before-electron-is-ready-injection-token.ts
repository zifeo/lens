/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectionToken } from "@ogre-tools/injectable";
import type { RunnableSync } from "@ogre-tools/injectable-utils";

export const beforeElectronIsReadyInjectionToken =
  getInjectionToken<RunnableSync>({
    id: "before-electron-is-ready",
  });
