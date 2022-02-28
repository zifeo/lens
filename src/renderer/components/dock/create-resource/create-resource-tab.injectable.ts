/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import dockStoreInjectable from "../dock/store.injectable";
import { DockTabCreateOption, TabKind } from "../dock/store";

const createResourceTabInjectable = getInjectable({
  id: "create-resource-tab",

  instantiate: (di) => {
    const dockStore = di.inject(dockStoreInjectable);

    return (tabParams: DockTabCreateOption = {}) =>
      dockStore.createTab({
        title: "Create resource",
        ...tabParams,
        kind: TabKind.CREATE_RESOURCE,
      });
  },
});

export default createResourceTabInjectable;
