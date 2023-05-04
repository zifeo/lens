/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import assert from "assert";
import podApiInjectable from "../../../common/k8s-api/endpoints/pod.api.injectable";
import storesAndApisCanBeCreatedInjectable from "../../stores-apis-can-be-created.injectable";
import { getKubeStoreInjectable } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import { PodStore } from "./store";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import { loggerInjectionToken } from "@k8slens/logger";
import requestPodMetricsByNamespaceInjectable from "./list-pod-metrics.injectable";

const podStoreInjectable = getKubeStoreInjectable({
  id: "pod-store",
  instantiate: (di) => {
    assert(di.inject(storesAndApisCanBeCreatedInjectable), "podStore is only available in certain environments");

    const api = di.inject(podApiInjectable);

    return new PodStore({
      requestPodMetricsByNamespace: di.inject(requestPodMetricsByNamespaceInjectable),
      context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
      logger: di.inject(loggerInjectionToken),
    }, api);
  },
});

export default podStoreInjectable;