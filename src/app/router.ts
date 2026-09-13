import { useEffect, useState } from "react";

export interface Route {
  /** 形如 "/", "/tree", "/explore/exp-6a-05-circumference" */
  path: string;
  params: URLSearchParams;
}

function parse(): Route {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const [path = "/", query = ""] = hash.split("?");
  return { path: path.startsWith("/") ? path : `/${path}`, params: new URLSearchParams(query) };
}

/** 极简 hash 路由：桌面应用内无需 history 路由。 */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(path: string, params?: Record<string, string>): void {
  const q = params ? `?${new URLSearchParams(params).toString()}` : "";
  window.location.hash = `${path}${q}`;
}

export function href(path: string, params?: Record<string, string>): string {
  const q = params ? `?${new URLSearchParams(params).toString()}` : "";
  return `#${path}${q}`;
}
