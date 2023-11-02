import { OwnerApi } from '../../../server/models/OwnerApi';

type OwnerId = OwnerApi['id'];
type OwnerName = OwnerApi['fullName'];

const graph: Map<OwnerId, Set<OwnerId>> = new Map();

function has(a: OwnerId, b: OwnerId): boolean {
  return (graph.get(a)?.has(b) || graph.get(b)?.has(a)) ?? false;
}

function add(a: OwnerId, b: OwnerId): void {
  const sourceEdges = graph.get(a) ?? new Set<OwnerId>();
  graph.set(a, sourceEdges.add(b));
  const destEdges = graph.get(b) ?? new Set<OwnerId>();
  graph.set(b, destEdges.add(a));
}

function clear(): void {
  graph.clear();
}

let current = '';
function currentName(name: OwnerName): void {
  if (current !== name) {
    graph.clear();
    current = name;
  }
}

const cache = {
  has,
  add,
  clear,
  currentName,
};

export default cache;
