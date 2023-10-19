export class ArrayMap<K, V> {
  private entries: [K, V][] = [];

  public get size(): number {
    return this.entries.length;
  }

  public at(index: number): [K, V] | undefined {
    return this.entries[index]?.slice() as [K, V] | undefined;
  }

  public set(key: K, value: V): void {
    const index = this.entries.findIndex(([k]) => k === key);
    if (index === -1) {
      this.entries.push([key, value]);
    } else {
      this.entries[index] = [key, value];
    }
  }

  public get(key: K): V | undefined {
    const entry = this.entries.find(([k]) => k === key);
    return entry?.[1];
  }

  public has(key: K): boolean {
    return this.entries.some(([k]) => k === key);
  }

  public clear(): void {
    this.entries = [];
  }

  public delete(key: K): boolean {
    const index = this.entries.findIndex(([k]) => k === key);
    if (index === -1) return false;
    this.entries.splice(index, 1);
    return true;
  }

  public keys(): K[] {
    return this.entries.map(([k]) => k);
  }

  public values(): V[] {
    return this.entries.map(([, v]) => v);
  }

  public forEach(cb: (value: V, key: K) => void): void {
    for (let i = 0; i < this.entries.length; i++) {
      const [key, value] = this.entries[i]!;
      cb(value, key);
    }
  }
}
