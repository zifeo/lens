/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import getClusterByIdInjectable, { type GetClusterById } from "../../../../../common/cluster-store/get-by-id.injectable";
import { ClusterProxySetting } from "../../../cluster-settings/proxy-setting";
import type { EntitySettingViewProps, RegisteredEntitySetting } from "../../extension-registrator.injectable";
import { entitySettingInjectionToken } from "../../token";

interface Dependencies {
  getClusterById: GetClusterById;
}

function NonInjectedProxyKubernetesClusterSettings({ entity, getClusterById }: EntitySettingViewProps & Dependencies) {
  const cluster = getClusterById(entity.getId());

  if (!cluster) {
    return null;
  }

  return (
    <section>
      <ClusterProxySetting cluster={cluster} />
    </section>
  );
}

const ProxyKubernetesClusterSettings = withInjectables<Dependencies, EntitySettingViewProps>(NonInjectedProxyKubernetesClusterSettings, {
  getProps: (di, props) => ({
    ...props,
    getClusterById: di.inject(getClusterByIdInjectable),
  }),
});

const proxyKubernetesClusterEntitySettingsInjectable = getInjectable({
  id: "proxy-kubernetes-cluster-entity-settings",
  instantiate: (): RegisteredEntitySetting => {
    const apiVersions = new Set(["entity.k8slens.dev/v1alpha1"]);

    return {
      isFor: (entity) => (
        apiVersions.has(entity.apiVersion)
        && entity.kind === "KubernetesCluster"
      ),
      title: "Proxy",
      group: "Settings",
      id: "proxy",
      orderNumber: 10,
      components: {
        View: ProxyKubernetesClusterSettings,
      },
    };
  },
  injectionToken: entitySettingInjectionToken,
});

export default proxyKubernetesClusterEntitySettingsInjectable;