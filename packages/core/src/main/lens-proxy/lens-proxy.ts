/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import net from "net";
import https from "https";
import type http from "http";
import type httpProxy from "http-proxy";
import { apiPrefix, apiKubePrefix } from "../../common/vars";
import type { RouteRequest } from "../router/route-request.injectable";
import type { Cluster } from "../../common/cluster/cluster";
import type { ProxyApiRequestArgs } from "./proxy-functions";
import assert from "assert";
import type { SetRequired } from "type-fest";
import type { EmitAppEvent } from "../../common/app-event-bus/emit-event.injectable";
import type { Logger } from "../../common/logger";
import type { SelfSignedCert } from "selfsigned";
import type { KubeAuthProxyServer } from "../cluster/kube-auth-proxy-server.injectable";
import { isLongRunningRequest } from "./is-long-running-request";
import { disallowedPorts } from "./disallowed-ports";

export type GetClusterForRequest = (req: http.IncomingMessage) => Cluster | undefined;
export type ServerIncomingMessage = SetRequired<http.IncomingMessage, "url" | "method">;
export type LensProxyApiRequest = (args: ProxyApiRequestArgs) => void | Promise<void>;

interface Dependencies {
  getClusterForRequest: GetClusterForRequest;
  shellApiRequest: LensProxyApiRequest;
  kubeApiUpgradeRequest: LensProxyApiRequest;
  emitAppEvent: EmitAppEvent;
  getKubeAuthProxyServer: (cluster: Cluster) => KubeAuthProxyServer;
  routeRequest: RouteRequest;
  readonly proxy: httpProxy;
  readonly lensProxyPort: { set: (portNumber: number) => void };
  readonly contentSecurityPolicy: string;
  readonly logger: Logger;
  readonly certificate: SelfSignedCert;
}

export class LensProxy {
  protected proxyServer: https.Server;
  protected closed = false;
  protected retryCounters = new Map<string, number>();

  constructor(private readonly dependencies: Dependencies) {
    this.configureProxy(dependencies.proxy);

    this.proxyServer = https.createServer(
      {
        key: dependencies.certificate.private,
        cert: dependencies.certificate.cert,
      },
      (req, res) => {
        this.handleRequest(req as ServerIncomingMessage, res);
      },
    );

    this.proxyServer
      .on("upgrade", (req: ServerIncomingMessage, socket: net.Socket, head: Buffer) => {
        const cluster = this.dependencies.getClusterForRequest(req);

        if (!cluster) {
          this.dependencies.logger.error(`[LENS-PROXY]: Could not find cluster for upgrade request from url=${req.url}`);
          socket.destroy();
        } else {
          const isInternal = req.url.startsWith(`${apiPrefix}?`);
          const reqHandler = isInternal ? this.dependencies.shellApiRequest : this.dependencies.kubeApiUpgradeRequest;

          (async () => reqHandler({ req, socket, head, cluster }))()
            .catch(error => this.dependencies.logger.error("[LENS-PROXY]: failed to handle proxy upgrade", error));
        }
      });
  }

  /**
   * Starts to listen on an OS provided port. Will reject if the server throws
   * an error.
   *
   * Resolves with the port number that was picked
   */
  private attemptToListen(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.proxyServer.listen(0, "127.0.0.1");

      this.proxyServer
        .once("listening", () => {
          this.proxyServer.removeAllListeners("error"); // don't reject the promise

          const { address, port } = this.proxyServer.address() as net.AddressInfo;

          this.dependencies.lensProxyPort.set(port);

          this.dependencies.logger.info(`[LENS-PROXY]: Proxy server has started at ${address}:${port}`);

          this.proxyServer.on("error", (error) => {
            this.dependencies.logger.info(`[LENS-PROXY]: Subsequent error: ${error}`);
          });

          this.dependencies.emitAppEvent({ name: "lens-proxy", action: "listen", params: { port }});
          resolve(port);
        })
        .once("error", (error) => {
          this.dependencies.logger.info(`[LENS-PROXY]: Proxy server failed to start: ${error}`);
          reject(error);
        });
    });
  }

  /**
   * Starts the lens proxy.
   * @resolves After the server is listening on a good port
   * @rejects if there is an error before that happens
   */
  async listen(): Promise<void> {
    const seenPorts = new Set<number>();

    while(true) {
      this.proxyServer?.close();
      const port = await this.attemptToListen();

      if (!disallowedPorts.has(port)) {
        // We didn't get a port that would result in an ERR_UNSAFE_PORT error, use it
        return;
      }

      this.dependencies.logger.warn(`[LENS-PROXY]: Proxy server has with port known to be considered unsafe to connect to by chrome, restarting...`);

      if (seenPorts.has(port)) {
        /**
         * Assume that if we have seen the port before, then the OS has looped
         * through all the ports possible and we will not be able to get a safe
         * port.
         */
        throw new Error("Failed to start LensProxy due to seeing too many unsafe ports. Please restart Lens.");
      } else {
        seenPorts.add(port);
      }
    }
  }

  close() {
    this.dependencies.logger.info("[LENS-PROXY]: Closing server");

    this.proxyServer.close();
    this.closed = true;
  }

  protected configureProxy(proxy: httpProxy): httpProxy {
    proxy.on("proxyRes", (proxyRes, req, res) => {
      const retryCounterId = this.getRequestId(req);

      if (this.retryCounters.has(retryCounterId)) {
        this.retryCounters.delete(retryCounterId);
      }

      proxyRes.on("aborted", () => { // happens when proxy target aborts connection
        res.end();
      });
    });

    proxy.on("error", (error, req, res, target) => {
      if (this.closed || res instanceof net.Socket) {
        return;
      }

      this.dependencies.logger.error(`[LENS-PROXY]: http proxy errored for cluster: ${error}`, { url: req.url });

      if (target) {
        this.dependencies.logger.debug(`Failed proxy to target: ${JSON.stringify(target, null, 2)}`);

        if (req.method === "GET" && (!res.statusCode || res.statusCode >= 500)) {
          const reqId = this.getRequestId(req);
          const retryCount = this.retryCounters.get(reqId) || 0;
          const timeoutMs = retryCount * 250;

          if (retryCount < 20) {
            this.dependencies.logger.debug(`Retrying proxy request to url: ${reqId}`);
            setTimeout(() => {
              this.retryCounters.set(reqId, retryCount + 1);
              this.handleRequest(req as ServerIncomingMessage, res)
                .catch(error => this.dependencies.logger.error(`[LENS-PROXY]: failed to handle request on proxy error: ${error}`));
            }, timeoutMs);
          }
        }
      }

      try {
        res.writeHead(500).end(`Oops, something went wrong.\n${error}`);
      } catch (e) {
        this.dependencies.logger.error(`[LENS-PROXY]: Failed to write headers: `, e);
      }
    });

    return proxy;
  }

  protected getRequestId(req: http.IncomingMessage): string {
    assert(req.headers.host);

    return req.headers.host + req.url;
  }

  protected async handleRequest(req: ServerIncomingMessage, res: http.ServerResponse) {
    const cluster = this.dependencies.getClusterForRequest(req);

    if (cluster && req.url.startsWith(apiKubePrefix)) {
      delete req.headers.authorization;
      req.url = req.url.replace(apiKubePrefix, "");

      const kubeAuthProxyServer = this.dependencies.getKubeAuthProxyServer(cluster);
      const proxyTarget = await kubeAuthProxyServer.getApiTarget(isLongRunningRequest(req.url));

      if (proxyTarget) {
        return this.dependencies.proxy.web(req, res, proxyTarget);
      }
    }

    res.setHeader("Content-Security-Policy", this.dependencies.contentSecurityPolicy);
    await this.dependencies.routeRequest(cluster, req, res);
  }
}
