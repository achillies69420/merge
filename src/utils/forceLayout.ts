import { CanvasElement, ConnectorLink, RoomElement } from "../types";

interface NodeSim {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  fixed: boolean;
}

interface SpringSim {
  sourceId: string;
  targetId: string;
  idealLength: number;
  strength: number;
}

/**
 * Runs a 2D force-directed layout simulation on room bubbles
 * to auto-cluster spaces based on functional adjacency connectors.
 */
export function computeForceClusterLayout(
  elements: CanvasElement[],
  connectors: ConnectorLink[],
  iterations = 60
): Map<string, { x: number; y: number }> {
  const roomElements = elements.filter(
    (el): el is RoomElement => el.type === "room_bubble"
  );

  if (roomElements.length <= 1) {
    return new Map();
  }

  // Calculate center of mass as anchor
  let sumX = 0;
  let sumY = 0;
  roomElements.forEach((r) => {
    sumX += r.x;
    sumY += r.y;
  });
  const centerX = sumX / roomElements.length;
  const centerY = sumY / roomElements.length;

  const nodes: NodeSim[] = roomElements.map((r) => ({
    id: r.id,
    x: r.x,
    y: r.y,
    vx: 0,
    vy: 0,
    width: r.width || 300,
    height: r.height || 120,
    fixed: !!r.parentColumnId, // Keep nested rooms in place if assigned to a column
  }));

  const nodeMap = new Map<string, NodeSim>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const springs: SpringSim[] = [];
  connectors.forEach((c) => {
    if (nodeMap.has(c.sourceId) && nodeMap.has(c.targetId)) {
      let idealLength = 320;
      let strength = 0.08;

      if (c.type === "direct_access") {
        idealLength = 260;
        strength = 0.15;
      } else if (c.type === "visual_link") {
        idealLength = 380;
        strength = 0.06;
      } else if (c.type === "acoustic_conflict") {
        idealLength = 650; // Push acoustic conflicts far apart!
        strength = -0.12;
      } else if (c.type === "service_link") {
        idealLength = 300;
        strength = 0.09;
      }

      springs.push({
        sourceId: c.sourceId,
        targetId: c.targetId,
        idealLength,
        strength,
      });
    }
  });

  const repulsionK = 60000;
  const damping = 0.85;

  for (let iter = 0; iter < iterations; iter++) {
    // 1. Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 100;
        const dist = Math.sqrt(distSq);

        const minSeparation = (n1.width + n2.width) / 2 + 40;
        const force = repulsionK / (distSq + minSeparation * minSeparation);

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!n1.fixed) {
          n1.vx -= fx;
          n1.vy -= fy;
        }
        if (!n2.fixed) {
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // 2. Spring attraction / repulsion along functional connectors
    for (const sp of springs) {
      const src = nodeMap.get(sp.sourceId);
      const tgt = nodeMap.get(sp.targetId);
      if (!src || !tgt) continue;

      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const delta = dist - sp.idealLength;
      const force = delta * sp.strength;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!src.fixed) {
        src.vx += fx;
        src.vy += fy;
      }
      if (!tgt.fixed) {
        tgt.vx -= fx;
        tgt.vy -= fy;
      }
    }

    // 3. Mild gravity pull toward center of cluster
    for (const node of nodes) {
      if (node.fixed) continue;
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.vx += dx * 0.005;
      node.vy += dy * 0.005;

      // Apply velocities with damping
      node.vx *= damping;
      node.vy *= damping;

      node.x += node.vx;
      node.y += node.vy;
    }
  }

  const result = new Map<string, { x: number; y: number }>();
  nodes.forEach((n) => {
    // Snap to 20px grid
    const snappedX = Math.round(n.x / 20) * 20;
    const snappedY = Math.round(n.y / 20) * 20;
    result.set(n.id, { x: snappedX, y: snappedY });
  });

  return result;
}
