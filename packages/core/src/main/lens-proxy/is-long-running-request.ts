/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getBoolean } from "../utils/parse-query";

const watchParam = "watch";
const followParam = "follow";

export function isLongRunningRequest(reqUrl: string) {
  const url = new URL(reqUrl, "http://localhost");

  return getBoolean(url.searchParams, watchParam) || getBoolean(url.searchParams, followParam);
}
