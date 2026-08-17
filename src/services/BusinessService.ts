export interface BusinessData {
  businessId: string;
  name: string;
  category: string;
  spaceId: string;
}

const mockBusinesses: BusinessData[] = [
  { businessId: 'b1', name: "Luna's Cafe", category: 'Cafe', spaceId: 'lunas-cafe' }
];

export const BusinessService = {
  async getBusinesses(): Promise<BusinessData[]> {
    return [...mockBusinesses];
  }
};
