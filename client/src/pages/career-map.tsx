import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Navigation from "@/components/Navigation";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";

interface CareerNode {
  id: string;
  role: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  salary?: number;
  skills: string[];
  description?: string;
  x: number;
  y: number;
}

interface SuggestedPath {
  role: string;
  timeframe: string;
  probability: number;
  requiredSkills: string[];
  salaryRange: string;
}

export default function CareerMap() {
  const [selectedNode, setSelectedNode] = useState<CareerNode | null>(null);

  const { data: careerData } = useQuery<{
    careerPaths: any[];
    suggestedPaths: SuggestedPath[];
    skillCount: number;
    totalExperience: number;
  }>({
    queryKey: ["/api/career-map"],
    retry: false,
  });

  const generateTimelineNodes = (careerPaths: any[]): CareerNode[] => {
    if (!careerPaths || careerPaths.length === 0) return [];

    const sortedPaths = careerPaths.sort((a, b) => 
      new Date(a.startDate || "1970-01-01").getTime() - new Date(b.startDate || "1970-01-01").getTime()
    );

    return sortedPaths.map((path, index) => ({
      id: path.id,
      role: path.role,
      company: path.company,
      startDate: path.startDate,
      endDate: path.endDate,
      isCurrent: path.isCurrent,
      salary: path.salary,
      skills: path.skills || [],
      description: path.description,
      x: 100 + (index * 200),
      y: 200 + (Math.sin(index * 0.5) * 50), // Slight curve for visual appeal
    }));
  };

  const nodes = careerData ? generateTimelineNodes(careerData.careerPaths || []) : [];
  const suggestedPaths: SuggestedPath[] = careerData?.suggestedPaths || [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Present";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const calculateYearsBetween = (start?: string, end?: string) => {
    const startDate = new Date(start || Date.now());
    const endDate = new Date(end || Date.now());
    return Math.max(0, endDate.getFullYear() - startDate.getFullYear());
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className="lg:pl-64 flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Career Map
                </h1>
                <p className="text-muted-foreground">
                  Visualize your career journey and explore potential growth paths
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Career Timeline Visualization */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Career Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {nodes.length > 0 ? (
                        <div className="relative">
                          {/* SVG Timeline */}
                          <svg
                            width="100%"
                            height="400"
                            viewBox="0 0 800 400"
                            className="border rounded-lg bg-muted/20"
                          >
                            {/* Timeline line */}
                            <line
                              x1="50"
                              y1="200"
                              x2="750"
                              y2="200"
                              stroke="hsl(var(--border))"
                              strokeWidth="2"
                              strokeDasharray="5,5"
                            />

                            {/* Career nodes */}
                            {nodes.map((node, index) => (
                              <g key={node.id}>
                                {/* Connection lines to previous node */}
                                {index > 0 && (
                                  <line
                                    x1={nodes[index - 1].x}
                                    y1={nodes[index - 1].y}
                                    x2={node.x}
                                    y2={node.y}
                                    stroke="hsl(var(--primary))"
                                    strokeWidth="3"
                                    opacity="0.6"
                                  />
                                )}

                                {/* Node circle */}
                                <motion.circle
                                  cx={node.x}
                                  cy={node.y}
                                  r={node.isCurrent ? "20" : "15"}
                                  fill={node.isCurrent ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
                                  stroke={node.isCurrent ? "hsl(var(--primary-foreground))" : "hsl(var(--border))"}
                                  strokeWidth="3"
                                  className="cursor-pointer"
                                  onClick={() => setSelectedNode(node)}
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                  data-testid={`node-${node.id}`}
                                />

                                {/* Node label */}
                                <text
                                  x={node.x}
                                  y={node.y - 35}
                                  textAnchor="middle"
                                  className="text-xs font-medium fill-foreground"
                                  onClick={() => setSelectedNode(node)}
                                  style={{ cursor: "pointer" }}
                                >
                                  {node.role}
                                </text>

                                {/* Company label */}
                                {node.company && (
                                  <text
                                    x={node.x}
                                    y={node.y + 35}
                                    textAnchor="middle"
                                    className="text-xs fill-muted-foreground"
                                  >
                                    {node.company}
                                  </text>
                                )}

                                {/* Date label */}
                                <text
                                  x={node.x}
                                  y={node.y + 50}
                                  textAnchor="middle"
                                  className="text-xs fill-muted-foreground"
                                >
                                  {formatDate(node.startDate)}
                                </text>
                              </g>
                            ))}
                          </svg>

                          {/* Legend */}
                          <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-primary"></div>
                              <span>Current Role</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-secondary border-2 border-border"></div>
                              <span>Past Role</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <i className="fas fa-map text-4xl text-muted-foreground mb-4"></i>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No Career Data</h3>
                          <p className="text-muted-foreground mb-4">
                            Add your career history in your profile to see your career map.
                          </p>
                          <Button variant="outline" onClick={() => window.location.href = "/profile"}>
                            Update Profile
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Side Panel */}
                <div className="space-y-6">
                  {/* Selected Node Details */}
                  {selectedNode && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Role Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h3 className="font-semibold text-foreground" data-testid="selected-role">
                              {selectedNode.role}
                            </h3>
                            {selectedNode.company && (
                              <p className="text-sm text-muted-foreground" data-testid="selected-company">
                                {selectedNode.company}
                              </p>
                            )}
                          </div>

                          <div className="text-sm">
                            <p className="text-muted-foreground">
                              {formatDate(selectedNode.startDate)} - {formatDate(selectedNode.endDate)}
                            </p>
                            <p className="text-muted-foreground">
                              Duration: {calculateYearsBetween(selectedNode.startDate, selectedNode.endDate)} years
                            </p>
                          </div>

                          {selectedNode.salary && (
                            <div>
                              <p className="text-sm font-medium">Salary</p>
                              <p className="text-lg font-semibold text-primary">
                                ${selectedNode.salary.toLocaleString()}
                              </p>
                            </div>
                          )}

                          {selectedNode.skills.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Skills Used</p>
                              <div className="flex flex-wrap gap-1">
                                {selectedNode.skills.map((skill, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedNode.description && (
                            <div>
                              <p className="text-sm font-medium mb-1">Description</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedNode.description}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Suggested Career Paths */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Suggested Next Steps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {suggestedPaths.length > 0 ? (
                        <div className="space-y-4">
                          {suggestedPaths.map((path, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                              data-testid={`suggested-path-${index}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-foreground">{path.role}</h4>
                                <Badge
                                  variant={path.probability >= 0.7 ? "default" : path.probability >= 0.4 ? "secondary" : "outline"}
                                >
                                  {Math.round(path.probability * 100)}% match
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-muted-foreground mb-2">
                                <p>Timeframe: {path.timeframe}</p>
                                <p>Salary: {path.salaryRange}</p>
                              </div>

                              <div className="mb-2">
                                <p className="text-sm font-medium mb-1">Required Skills:</p>
                                <div className="flex flex-wrap gap-1">
                                  {path.requiredSkills.slice(0, 3).map((skill, skillIndex) => (
                                    <Badge key={skillIndex} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {path.requiredSkills.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{path.requiredSkills.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <Progress 
                                value={path.probability * 100} 
                                className="h-2"
                                data-testid={`progress-path-${index}`}
                              />
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <i className="fas fa-compass text-3xl text-muted-foreground mb-3"></i>
                          <p className="text-sm text-muted-foreground">
                            Complete your profile to get personalized career path suggestions.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Career Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Career Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {nodes.length > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Roles</span>
                            <span className="font-semibold" data-testid="total-roles">
                              {nodes.length}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Career Span</span>
                            <span className="font-semibold" data-testid="career-span">
                              {calculateYearsBetween(nodes[0]?.startDate, nodes[nodes.length - 1]?.endDate || undefined)} years
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Unique Skills</span>
                            <span className="font-semibold" data-testid="unique-skills">
                              {new Set(nodes.flatMap(node => node.skills)).size}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Companies</span>
                            <span className="font-semibold" data-testid="total-companies">
                              {new Set(nodes.map(node => node.company).filter(Boolean)).size}
                            </span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}