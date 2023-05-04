/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { shouldShowResourceInjectionToken } from "../../../../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { getFrontEndRouteInjectable } from "../../../../front-end-route-injection-token";

const replicationControllersRouteInjectable = getFrontEndRouteInjectable({
  id: "replication-controllers-route",
  path: "/replication-controllers",
  clusterFrame: true,
  isEnabled: (di) => di.inject(shouldShowResourceInjectionToken, {
    apiName: "replicationcontrollers",
    group: "", // core
  }),
});

export default replicationControllersRouteInjectable;