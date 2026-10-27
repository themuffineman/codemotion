// Tiny binary min-heap of [distance, node] pairs. Smallest distance sits at index 0.
export class MinHeap {
  private items: [number, string][] = [];

  get size() {
    return this.items.length;
  }

  push(item: [number, string]) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    // bubble up while the parent is bigger
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent][0] <= a[i][0]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }

  pop(): [number, string] {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      // sink down while a child is smaller
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let small = i;
        if (l < a.length && a[l][0] < a[small][0]) small = l;
        if (r < a.length && a[r][0] < a[small][0]) small = r;
        if (small === i) break;
        [a[small], a[i]] = [a[i], a[small]];
        i = small;
      }
    }
    return top;
  }
}
