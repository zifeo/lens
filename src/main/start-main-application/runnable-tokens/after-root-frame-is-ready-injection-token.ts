/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectionToken } from "@ogre-tools/injectable";
import type { Runnable } from "@ogre-tools/injectable-utils";

export const afterRootFrameIsReadyInjectionToken = getInjectionToken<Runnable>({
  id: "after-root-frame-is-ready",
});
