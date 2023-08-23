export class RequestBatch {
  private status: "idle" | "waiting" = "idle";

  constructor(private readonly callback: () => void) {}

  public request(): void {
    if (this.status === "waiting") {
      return;
    }

    this.status = "waiting";

    queueMicrotask(() => {
      try {
        this.callback();
      } finally {
        this.status = "idle";
      }
    });
  }
}
