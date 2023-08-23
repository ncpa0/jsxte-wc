export class VirtualTextNode {
  public readonly elementName: "text-node" = "text-node";
  public readonly element = document.createTextNode("");

  constructor(private text: string) {
    this.element.textContent = text;
  }

  public update(text: string): void {
    if (text === this.text) return;
    this.text = text;
    this.element.textContent = text;
  }
}
