/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import getTrayIconPathInjectable from "../../../../../tray/main/menu-icon/get-tray-icon-path.injectable";
import { trayIconInjectionToken } from "../../../../../tray/main/menu-icon/tray-icon-injection-token";
import updateIsReadyToBeInstalledInjectable from "../../../../main/update-is-ready-to-be-installed.injectable";

const updateIsReadyToBeInstalledTrayIconInjectable = getInjectable({
  id: "update-is-ready-to-be-installed-tray-icon",

  instantiate: (di) => {
    const getTrayIconPath = di.inject(getTrayIconPathInjectable);
    const updateIsReadyToBeInstalled = di.inject(updateIsReadyToBeInstalledInjectable);

    return {
      iconPath: getTrayIconPath("update-available"),
      priority: 1,
      shouldBeShown: updateIsReadyToBeInstalled,
    };
  },

  injectionToken: trayIconInjectionToken,
});

export default updateIsReadyToBeInstalledTrayIconInjectable;