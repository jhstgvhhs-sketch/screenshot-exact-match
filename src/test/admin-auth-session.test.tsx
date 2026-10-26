import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
type Session = { user: { id: string } } | null;
type RoleResult = { data: { role: string } | null; error: unknown };
const m = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: Session) => void),
  role: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (listener: (event: string, session: Session) => void) => {
        m.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => {
      const q = { select: () => q, eq: () => q, maybeSingle: m.role };
      return q;
    },
  },
}));
import { useState } from "react";
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
    let resolve: (value: RoleResult) => void = () => {};
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
  it("preserves the mounted admin editor during same-user sign-in and token refresh", async () => {
    m.role.mockResolvedValue({ data: { role: "admin" }, error: null });
    function Editor() {
      const [draft, setDraft] = useState("");
      return (
        <input
          aria-label="Product draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      );
    }
    function Protected() {
      const { loading, isAdmin } = useAuth();
      return loading ? <p>Checking session</p> : isAdmin ? <Editor /> : <p>Access denied</p>;
    }
    render(
      <AuthProvider>
        <Protected />
      </AuthProvider>,
    );
    await event("SIGNED_IN", "admin");
    await tick();
    fireEvent.change(screen.getByLabelText("Product draft"), {
      target: { value: "Unsaved product details" },
    });
    await event("SIGNED_IN", "admin");
    expect(screen.getByLabelText("Product draft")).toHaveValue("Unsaved product details");
    await tick();
    await event("TOKEN_REFRESHED", "admin");
    expect(screen.getByLabelText("Product draft")).toHaveValue("Unsaved product details");
    await tick();
    expect(m.role).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText("Product draft")).toHaveValue("Unsaved product details");
    await event("SIGNED_OUT", null);
    expect(screen.queryByLabelText("Product draft")).not.toBeInTheDocument();
  });
  it("revokes administrative access if the background role check no longer permits it", async () => {
    m.role.mockResolvedValue({ data: { role: "admin" }, error: null });
    render(
      <AuthProvider>
        <State />
      </AuthProvider>,
    );
    await event("SIGNED_IN", "admin");
    await tick();
    m.role.mockResolvedValue({ data: null, error: null });
    await event("SIGNED_IN", "admin");
    expect(screen.getByText("admin:admin")).toBeInTheDocument();
    await tick();
    expect(screen.getByText("admin:denied")).toBeInTheDocument();
  });
});
