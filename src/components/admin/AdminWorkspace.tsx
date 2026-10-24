import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  ShoppingCart,
  Ticket,
  Package,
  Plus,
  Tags,
  Boxes,
  Star,
  Wallet,
  ChartNoAxesCombined,
  CreditCard,
  MessagesSquare,
  Workflow,
  Truck,
  PackageCheck,
  Settings,
  Bell,
  Shield,
  Menu,
  PanelLeftClose,
  LogOut,
  ChevronRight,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery } from "@/lib/catalog";
import { AdminSectionBoundary } from "@/components/site/AdminSectionBoundary";
import { PaymentGatewaySettings } from "@/components/site/PaymentGatewaySettings";
import { StoreSettingsEditor } from "@/components/site/StoreSettings";
import { PurchaseNotificationSettings } from "@/components/site/PurchaseNotificationSettings";
import { ReviewModeration, AdminAddReview } from "@/components/site/ProductReviews";
import { CartRegistry } from "./CartRegistry";
import { AbandonedCarts } from "@/components/site/AbandonedCarts";
import { CategoryManager, NewProductForm } from "./CatalogEditors";
import { Panel, QueryState, action } from "./AdminUi";
const FinancialDashboard = lazy(() =>
  import("./FinancialDashboard").then((m) => ({ default: m.FinancialDashboard })),
);
const OrdersPage = lazy(() => import("./OrdersPage").then((m) => ({ default: m.OrdersPage })));
const CustomersPage = lazy(() =>
  import("./CustomersPage").then((m) => ({ default: m.CustomersPage })),
);
const CatalogPage = lazy(() => import("./CatalogPage").then((m) => ({ default: m.CatalogPage })));
const CouponsPage = lazy(() => import("./CouponsPage").then((m) => ({ default: m.CouponsPage })));
type NavItem = { id: string; title: string; icon: LucideIcon };
const adminNavigation: { group: string; items: NavItem[] }[] = [
  { group: "Visão geral", items: [{ id: "dashboard", title: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Vendas",
    items: [
      { id: "orders", title: "Pedidos", icon: ShoppingBag },
      { id: "customers", title: "Clientes", icon: Users },
      { id: "carts", title: "Carrinhos abandonados", icon: ShoppingCart },
      { id: "coupons", title: "Cupons de desconto", icon: Ticket },
    ],
  },
  {
    group: "Catálogo",
    items: [
      { id: "products", title: "Todos os produtos", icon: Package },
      { id: "add-product", title: "Adicionar produto", icon: Plus },
      { id: "categories", title: "Categorias", icon: Tags },
      { id: "stock", title: "Estoque", icon: Boxes },
      { id: "reviews", title: "Avaliações", icon: Star },
    ],
  },
  {
    group: "Financeiro",
    items: [
      { id: "finance", title: "Visão financeira", icon: Wallet },
      { id: "reports", title: "Relatórios de vendas", icon: ChartNoAxesCombined },
      { id: "payments", title: "Pagamentos", icon: CreditCard },
    ],
  },
  {
    group: "Marketing",
    items: [
      { id: "remarketing", title: "Remarketing", icon: MessagesSquare },
      { id: "automations", title: "Automações", icon: Workflow },
    ],
  },
  {
    group: "Logística",
    items: [
      { id: "tracking", title: "Rastreamento", icon: Truck },
      { id: "shipped", title: "Pedidos enviados", icon: Package },
      { id: "delivered", title: "Pedidos entregues", icon: PackageCheck },
    ],
  },
  {
    group: "Sistema",
    items: [
      { id: "settings", title: "Configurações da loja", icon: Settings },
      { id: "payment-settings", title: "Configurações de pagamento", icon: CreditCard },
      { id: "notifications", title: "Notificações", icon: Bell },
      { id: "security", title: "Segurança", icon: Shield },
    ],
  },
];
export function AdminWorkspace({ section, identity }: { section: string; identity: string }) {
  const sidebar = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [signoutError, setSignoutError] = useState("");
  const found = adminNavigation.flatMap((g) => g.items).find((item) => item.id === section);
  const current = found?.id ?? "dashboard";
  const title = found?.title ?? "Dashboard";
  useEffect(() => {
    setCollapsed(localStorage.getItem("3dflex-admin-sidebar") === "collapsed");
  }, []);
  useEffect(() => {
    setMobile(false);
  }, [section]);
  useEffect(() => {
    if (!mobile) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [],
      );
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
      if (event.key !== "Tab") return;
      const nodes = focusable();
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      previousFocus?.focus();
    };
  }, [mobile]);
  async function signout() {
    const { error } = await supabase.auth.signOut();
    if (error) setSignoutError("Não foi possível sair. Tente novamente.");
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobile && (
        <button
          aria-label="Fechar navegação"
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebar}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile || undefined}
        aria-label="Navegação administrativa"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-[#141414] transition-[width,transform] ${collapsed ? "lg:w-20" : "lg:w-64"} w-64 ${mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <Link
          to="/admin"
          search={{ section: "dashboard" }}
          onClick={() => setMobile(false)}
          className="flex h-20 shrink-0 items-center gap-2 border-b border-border px-5 font-display text-xl font-extrabold"
        >
          <span className="text-primary">3D</span>
          {(!collapsed || mobile) && (
            <span>
              FLEX{" "}
              <span className="ml-2 text-[10px] font-medium tracking-widest text-muted-foreground">
                ADMIN
              </span>
            </span>
          )}
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {adminNavigation.map((group) => (
            <div key={group.group} className="mb-6">
              {(!collapsed || mobile) && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">
                  {group.group}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    to="/admin"
                    search={{ section: item.id }}
                    onClick={() => setMobile(false)}
                    aria-label={item.title}
                    title={item.title}
                    aria-current={current === item.id ? "page" : undefined}
                    className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${current === item.id ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {(!collapsed || mobile) && <span>{item.title}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        {(!collapsed || mobile) && (
          <p
            className="truncate border-t border-border px-5 py-3 text-xs text-muted-foreground"
            title={identity}
          >
            {identity}
          </p>
        )}
        <a
          href="/"
          className="flex items-center gap-3 border-t border-border px-6 py-4 text-sm text-muted-foreground"
          title="Ver loja"
        >
          <ExternalLink size={17} />
          {(!collapsed || mobile) && "Ver loja"}
        </a>
      </aside>
      <div className={collapsed ? "lg:pl-20" : "lg:pl-64"}>
        <header className="sticky top-0 z-30 flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button
              className={action + " lg:hidden"}
              aria-label="Abrir navegação"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={18} />
            </button>
            <button
              className={action + " hidden lg:inline-flex"}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              onClick={() => {
                const next = !collapsed;
                setCollapsed(next);
                localStorage.setItem("3dflex-admin-sidebar", next ? "collapsed" : "expanded");
              }}
            >
              <PanelLeftClose size={18} />
            </button>
            <div>
              <p className="text-sm font-bold">
                3DFLEX{" "}
                <span className="font-normal text-muted-foreground">| Painel Administrativo</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                Administração
                <ChevronRight size={12} />
                <span className="text-foreground">{title}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="hidden max-w-48 truncate text-xs text-muted-foreground xl:block"
              title={identity}
            >
              {identity}
            </span>
            <Link
              to="/admin"
              search={{ section: "settings" }}
              className={action}
              aria-label="Abrir configurações"
            >
              <Settings size={17} />
            </Link>
            <button className={action} onClick={() => void signout()}>
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-7">
          {signoutError && <p role="alert">{signoutError}</p>}
          {!["dashboard", "finance", "reports"].includes(current) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Gestão da loja
              </p>
              <h1 className="mt-2 text-2xl font-bold">{title}</h1>
            </div>
          )}
          <AdminSectionBoundary key={current} title={title}>
            <Suspense
              fallback={
                <p role="status" className="animate-pulse p-8 text-muted-foreground">
                  Carregando seção…
                </p>
              }
            >
              <WorkspacePage section={current} />
            </Suspense>
          </AdminSectionBoundary>
        </main>
      </div>
    </div>
  );
}
function WorkspacePage({ section }: { section: string }) {
  const client = useQueryClient();
  const categories = useQuery({
    ...categoriesQuery(),
    enabled: section === "categories" || section === "add-product",
  });
  const options = useQuery({
    queryKey: ["admin-review-product-options"],
    enabled: section === "reviews",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name")
        .order("name")
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    ["admin-catalog", "products", "categories"].forEach(
      (key) => void client.invalidateQueries({ queryKey: [key] }),
    );
  };
  switch (section) {
    case "dashboard":
    case "finance":
      return <FinancialDashboard />;
    case "reports":
      return <FinancialDashboard reports />;
    case "orders":
    case "tracking":
      return <OrdersPage />;
    case "shipped":
      return <OrdersPage initialFilter="shipped" />;
    case "delivered":
      return <OrdersPage initialFilter="delivered" />;
    case "customers":
      return <CustomersPage />;
    case "products":
    case "stock":
      return (
        <CatalogPage
          stockOnly={section === "stock"}
          onAdd={() => {
            window.location.href = "/admin?section=add-product";
          }}
        />
      );
    case "add-product":
    case "categories":
      return (
        <>
          <QueryState
            loading={categories.isLoading}
            error={categories.isError}
            retry={() => void categories.refetch()}
          />
          {categories.data &&
            (section === "add-product" ? (
              <NewProductForm categories={categories.data} onSaved={refresh} />
            ) : (
              <CategoryManager categories={categories.data} onSaved={refresh} />
            ))}
        </>
      );
    case "reviews":
      return (
        <>
          <QueryState
            loading={options.isLoading}
            error={options.isError}
            retry={() => void options.refetch()}
          />
          {options.data && <AdminAddReview products={options.data} />}
          <ReviewModeration />
        </>
      );
    case "coupons":
      return <CouponsPage />;
    case "carts":
      return <CartRegistry />;
    case "remarketing":
      return <AbandonedCarts view="automation" />;
    case "automations":
      return <AbandonedCarts view="history" />;
    case "settings":
      return <StoreSettingsEditor />;
    case "notifications":
      return <PurchaseNotificationSettings />;
    case "payment-settings":
      return <PaymentGatewaySettings />;
    case "payments":
      return (
        <>
          <p className="text-sm text-muted-foreground">
            Consulte a situação financeira e abra os detalhes do pedido. A confirmação manual exige
            verificar o recebimento real.
          </p>
          <OrdersPage />
        </>
      );
    case "security":
      return (
        <Panel title="Acesso administrativo">
          <p className="text-sm leading-relaxed text-muted-foreground">
            O acesso usa a autenticação existente do Supabase e a atribuição administrativa em
            user_roles. Os dados financeiros exigem autorização também no banco. Este painel não
            mostra senhas, chaves ou tokens.
          </p>
          <p className="mt-4 text-sm">
            Permissões de contas e credenciais continuam sob gestão do responsável pelo backend. Não
            há alteração automática de privilégios.
          </p>
        </Panel>
      );
    default:
      return null;
  }
}
