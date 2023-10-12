export class RequestBatch {
  private status: "idle" | "waiting" = "idle";

  constructor(private readonly callback: () => () => void) {}

  public request(): void {
    if (this.status === "waiting") {
      return;
    }

    this.status = "waiting";

    queueMicrotask(() => {
      let runAfter: (() => void) | undefined;
      try {
        runAfter = this.callback();
      } finally {
        this.status = "idle";
        runAfter?.();
      }
    });
  }
}
