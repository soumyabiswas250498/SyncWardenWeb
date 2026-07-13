import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "@/mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  // Reset IndexedDB between tests so device identity never leaks across cases.
  globalThis.indexedDB = new IDBFactory();
});
afterAll(() => server.close());
