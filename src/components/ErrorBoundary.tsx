"use client";

import { Component, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Uncaught error in app tree:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="border border-black p-6">
            <div className="text-sm uppercase tracking-widest text-black/60">
              Something went wrong
            </div>
            <p className="mt-3 text-sm">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-6 border border-black px-4 py-2 text-sm hover:bg-black hover:text-white"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
