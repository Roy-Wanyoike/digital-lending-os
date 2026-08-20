"use client";

import React, { useMemo } from "react";
import { ProviderStatus } from "@/lib/provider-health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DependencyGraphProps {
  providers: ProviderStatus[];
  selectedProvider?: string | null;
  onProviderSelect?: (providerId: string) => void;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  icon: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

export function DependencyGraph({
  providers,
  selectedProvider,
  onProviderSelect,
}: DependencyGraphProps) {
  // Calculate node positions in a circular layout
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    
    // Group providers by type for layout
    const types = ["payment", "kyc", "credit", "communication", "banking"];
    const typeGroups: Record<string, ProviderStatus[]> = {};
    
    types.forEach(type => {
      typeGroups[type] = providers.filter(p => p.type === type);
    });

    // Calculate positions - grid-like layout by type
    let yOffset = 0;
    const nodeWidth = 180;
    const nodeHeight = 80;
    const gapX = 20;
    const gapY = 30;

    providers.forEach((provider) => {
      const typeIndex = types.indexOf(provider.type);
      const typeProviders = typeGroups[provider.type];
      const indexInType = typeProviders.indexOf(provider);

      const x = 20 + indexInType * (nodeWidth + gapX);
      const y = 40 + typeIndex * (nodeHeight + gapY);

      nodeMap.set(provider.id, {
        id: provider.id,
        label: `${provider.icon} ${provider.displayName}`,
        type: provider.type,
        status: provider.status,
        icon: provider.icon,
        x,
        y,
      });
    });

    // Create edges based on dependencies
    const graphEdges: GraphEdge[] = [];
    providers.forEach((provider) => {
      provider.dependencies.forEach((depId) => {
        if (nodeMap.has(depId)) {
          graphEdges.push({ from: provider.id, to: depId });
        }
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: graphEdges,
    };
  }, [providers]);

  const statusColors = {
    healthy: { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
    degraded: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
    down: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
    unknown: { bg: "#f3f4f6", border: "#9ca3af", text: "#374151" },
  };

  const typeLabels: Record<string, string> = {
    payment: "💳 Payment",
    kyc: "🆔 KYC Verification",
    credit: "📋 Credit Services",
    communication: "📡 Communication",
    banking: "🏦 Banking",
  };

  // Calculate SVG dimensions
  const svgWidth = Math.max(800, ...nodes.map(n => n.x)) + 200;
  const svgHeight = Math.max(400, ...nodes.map(n => n.y)) + 100;

  // Find affected dependencies when a provider is down/degraded
  const getAffectedNodes = () => {
    const affected = new Set<string>();
    
    // Find all failing providers
    const failingProviders = providers.filter(
      p => p.status === "down" || p.status === "degraded"
    );
    
    failingProviders.forEach(fp => {
      affected.add(fp.id);
      // Find providers that depend on this one
      edges.forEach(edge => {
        if (edge.to === fp.id) {
          affected.add(edge.from);
        }
      });
    });
    
    return affected;
  };

  const affectedNodes = getAffectedNodes();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Dependency Map
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Healthy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Degraded</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Down</span>
            </div>
            {affectedNodes.size > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {affectedNodes.size} potentially affected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Type Legend */}
        <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b">
          {Object.entries(typeLabels).map(([type, label]) => (
            <div key={type} className="flex items-center gap-2 text-sm">
              <span>{label}</span>
              <Badge variant="outline" className="text-xs">
                {providers.filter(p => p.type === type).length}
              </Badge>
            </div>
          ))}
        </div>

        {/* Graph Visualization */}
        <div className="overflow-auto border rounded-lg bg-gray-50/50">
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="min-w-full"
          >
            {/* Definitions */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
              <marker
                id="arrowhead-danger"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
              </marker>
            </defs>

            {/* Edges */}
            {edges.map((edge, index) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              
              if (!fromNode || !toNode) return null;

              const isDangerous =
                fromNode.status === "down" ||
                toNode.status === "down" ||
                fromNode.status === "degraded" ||
                toNode.status === "degraded";

              return (
                <line
                  key={index}
                  x1={fromNode.x + 90}
                  y1={fromNode.y + 25}
                  x2={toNode.x + 90}
                  y2={toNode.y + 55}
                  stroke={isDangerous ? "#ef4444" : "#94a3b8"}
                  strokeWidth={isDangerous ? 2 : 1.5}
                  strokeDasharray={isDangerable ? undefined : "5 5"}
                  markerEnd={
                    isDangerable ? "url(#arrowhead-danger)" : "url(#arrowhead)"
                  }
                  opacity={isDangerable ? 1 : 0.6}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const colors = statusColors[node.status];
              const isSelected = selectedProvider === node.id;
              const isAffected = affectedNodes.has(node.id);

              return (
                <g
                  key={node.id}
                  onClick={() => onProviderSelect?.(node.id)}
                  style={{ cursor: "pointer" }}
                  className="transition-all duration-200 hover:opacity-80"
                >
                  {/* Node background */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={nodeWidth}
                    height={nodeHeight}
                    rx={8}
                    ry={8}
                    fill={colors.bg}
                    stroke={isSelected ? "#3b82f6" : colors.border}
                    strokeWidth={isSelected ? 3 : 2}
                    className={isAffected && !isSelected ? "animate-pulse" : ""}
                  />

                  {/* Status indicator dot */}
                  <circle
                    cx={node.x + 16}
                    cy={node.y + 16}
                    r={6}
                    fill={colors.border}
                    className={
                      node.status === "down" ? "animate-ping-slow" : ""
                    }
                  />

                  {/* Icon and label */}
                  <text
                    x={node.x + 28}
                    y={node.y + 32}
                    fontSize={14}
                    fill={colors.text}
                    fontWeight="600"
                  >
                    {node.icon} {node.displayName.split(" ")[0]}
                  </text>

                  {/* Status text */}
                  <text
                    x={node.x + 16}
                    y={node.y + 54}
                    fontSize={11}
                    fill={colors.text}
                    opacity={0.8}
                  >
                    {node.status.charAt(0).toUpperCase() + node.status.slice(1)}
                  </text>

                  {/* Latency info */}
                  <text
                    x={node.x + nodeWidth - 16}
                    y={node.y + 32}
                    fontSize={10}
                    fill={colors.text}
                    textAnchor="end"
                    opacity={0.7}
                  >
                    {(() => {
                      const latency = providers.find(p => p.id === node.id)?.latency.p95;
                      if (!latency) return 'N/A';
                      return latency >= 1000 ? `${(latency / 1000).toFixed(1)}s` : `${latency}ms`;
                    })()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Impact Analysis */}
        {affectedNodes.size > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Potential Impact Analysis
            </h4>
            <ul className="space-y-1 text-sm text-red-700">
              {Array.from(affectedNodes).map(nodeId => {
                const provider = providers.find(p => p.id === nodeId);
                return (
                  <li key={nodeId} className="flex items-center gap-2">
                    <span>{provider?.icon}</span>
                    <span>{provider?.displayName}</span>
                    {provider?.status === "down" && (
                      <Badge variant="destructive" className="text-xs">DOWN</Badge>
                    )}
                    {provider?.status === "degraded" && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">DEGRADED</Badge>
                    )}
                    {provider?.status === "healthy" && (
                      <span className="text-xs text-muted-foreground">(may be affected)</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Instructions */}
        <p className="mt-4 text-sm text-muted-foreground text-center">
          Click on any provider to view details • Arrows show dependency direction
        </p>
      </CardContent>
    </Card>
  );
}

export default DependencyGraph;
