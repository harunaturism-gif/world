export interface LandPlot {
  landId: string;
  ownerId: string | null;
  location: string;
  status: string;
}

const mockPlots: LandPlot[] = [
  { landId: "048192", ownerId: "dev-user-1", location: "District 4 • Studio Setup", status: "Open to Public" },
  { landId: "central-plaza", ownerId: null, location: "Genesis District • Center", status: "Public Asset" },
  { landId: "lunas-cafe", ownerId: "luna", location: "District 2 • Retail Corner", status: "Open" },
  { landId: "neon-arcade", ownerId: "sys", location: "District 1 • Entertainment Hub", status: "Event Active" },
];

export const LandService = {
  async getPlots(): Promise<LandPlot[]> {
    return [...mockPlots];
  }
};
