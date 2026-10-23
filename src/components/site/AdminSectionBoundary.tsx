import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { title: string; children: ReactNode };
type State = { failed: boolean; details: string };

export class AdminSectionBoundary extends Component<Props, State> {
  state: State = { failed: false, details: "" };

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, details: error.message || "Erro desconhecido" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro na seção administrativa:", this.props.title, error, info.componentStack);
  }

  render() {
    if (this.state.failed) return (
      <section role="alert" className="mt-5 rounded-xl border border-destructive/40 bg-card p-5">
        <h2 className="font-bold">Não foi possível carregar: {this.props.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">As outras funções do painel continuam disponíveis.</p>
        <p className="mt-2 break-words text-xs text-destructive">{this.state.details}</p>
        <button type="button" onClick={() => this.setState({ failed: false, details: "" })} className="mt-3 rounded-lg border border-input px-4 py-2 text-sm font-semibold">Tentar novamente</button>
      </section>
    );
    return this.props.children;
  }
}
