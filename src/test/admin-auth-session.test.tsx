import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: any) => void),
  role: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (listener: any) => {
        m.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => {
      const q: any = {};
      q.select = () => q;
      q.eq = () => q;
      q.maybeSingle = m.role;
      return q;
    },
  },
}));
import { AuthProvider, useAuth } from "@/lib/auth";
function State() {
  const { user, isAdmin, loading } = useAuth();
  return (
    <p>
      {user?.id ?? "guest"}:{loading ? "checking" : isAdmin ? "admin" : "denied"}
    </p>
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  m.role.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const event = async (type: string, id: string | null) => {
  await act(async () => {
    m.listener!(type, id ? { user: { id } } : null);
  });
};
const tick = async () => {
  await act(async () => {
    await vi.runOnlyPendingTimersAsync();
  });
};
describe("Administrative session isolation", () => {
  it("clears the previous administrator before checking another account", async () => {
    m.role.mockResolvedValue({ data: { role: "admin" }, error: null });
    render(
      <AuthProvider>
        <State />
      </AuthProvider>,
    );
    await event("SIGNED_IN", "admin");
    await tick();
    expect(screen.getByText("admin:admin")).toBeInTheDocument();
    m.role.mockResolvedValue({ data: null, error: null });
    await event("SIGNED_IN", "customer");
    expect(screen.getByText("customer:checking")).toBeInTheDocument();
    await tick();
    expect(screen.getByText("customer:denied")).toBeInTheDocument();
  });
  it("ignores a delayed role response after logout", async () => {
    let resolve: (value: any) => void = () => {};
    m.role.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(
      <AuthProvider>
        <State />
      </AuthProvider>,
    );
    await event("SIGNED_IN", "admin");
    await tick();
    await event("SIGNED_OUT", null);
    await tick();
    await act(async () => {
      resolve({ data: { role: "admin" }, error: null });
    });
    expect(screen.getByText("guest:denied")).toBeInTheDocument();
  });
  it("denies authorization if the role lookup fails", async () => {
    m.role.mockRejectedValue(new Error("offline"));
    render(
      <AuthProvider>
        <State />
      </AuthProvider>,
    );
    await event("SIGNED_IN", "customer");
    await tick();
    expect(screen.getByText("customer:denied")).toBeInTheDocument();
  });
});
