"use client";
import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  PeekNode,
  MeshNode,
  SilkNode,
  ActionNode,
  TriggerNode,
  ConditionNode,
} from "./NodeTypes";

const nodeTypes = {
  peek: PeekNode,
  mesh: MeshNode,
  silk: SilkNode,
  action: ActionNode,
  trigger: TriggerNode,
  condition: ConditionNode,
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "trigger",
    position: { x: 60, y: 220 },
    data: { label: "Call Start", detail: "Inbound call received" },
  },
  {
    id: "2",
    type: "peek",
    position: { x: 320, y: 130 },
    data: {
      label: "Intent Radar",
      detail: "Vocal tension threshold: 7.0",
      threshold: "70",
    },
  },
  {
    id: "3",
    type: "mesh",
    position: { x: 320, y: 320 },
    data: {
      label: "Memory Vault",
      detail: "Recall last 3 interactions",
    },
  },
  {
    id: "4",
    type: "condition",
    position: { x: 590, y: 215 },
    data: {
      label: "Frustration > 70%?",
      detail: "Branch on empathy threshold",
    },
  },
  {
    id: "5",
    type: "silk",
    position: { x: 870, y: 100 },
    data: {
      label: "Empathy Reactor",
      detail: "Injects prosody mid-sentence",
      tag: "<apologetic_whisper>",
    },
  },
  {
    id: "6",
    type: "action",
    position: { x: 870, y: 310 },
    data: {
      label: "Queue Skip + Credit",
      detail: "Priority queue · Stripe $10",
      api: "stripe.credit + queue.elevate",
    },
  },
  {
    id: "7",
    type: "silk",
    position: { x: 1140, y: 205 },
    data: {
      label: "Resolution Close",
      detail: "Warm closing sequence",
      tag: "<warm_closing>",
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "#0a0a0a", strokeWidth: 1.5 },
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    animated: true,
    style: { stroke: "#0a0a0a", strokeWidth: 1.5 },
  },
  {
    id: "e2-4",
    source: "2",
    target: "4",
    style: { stroke: "#0a0a0a", strokeWidth: 1.5 },
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    style: { stroke: "#0a0a0a", strokeWidth: 1.5 },
  },
  {
    id: "e4-5",
    source: "4",
    sourceHandle: "yes",
    target: "5",
    label: "YES",
    style: { stroke: "#0a0a0a", strokeWidth: 1.5 },
  },
  {
    id: "e4-6",
    source: "4",
    sourceHandle: "no",
    target: "6",
    label: "NO",
    style: { stroke: "#0a0a0a", strokeWidth: 1.5 },
  },
  {
    id: "e5-7",
    source: "5",
    target: "7",
    style: { stroke: "#0a0a0a", strokeWidth: 1.5 },
  },
  {
    id: "e6-7",
    source: "6",
    target: "7",
    style: { stroke: "#0a0a0a", strokeWidth: 1.5 },
  },
];

export default function CanvasClient() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, style: { stroke: "#0a0a0a", strokeWidth: 1.5 } },
          eds
        )
      ),
    [setEdges]
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ background: "#f0ebe0" }}
        defaultEdgeOptions={{
          style: { stroke: "#0a0a0a", strokeWidth: 1.5 },
        }}
      >
        <Background
          color="rgba(0,0,0,0.1)"
          gap={22}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls
          style={{
            border: "1px solid #0a0a0a",
            boxShadow: "2px 2px 0px rgba(0,0,0,0.85)",
          }}
        />
      </ReactFlow>
    </div>
  );
}
