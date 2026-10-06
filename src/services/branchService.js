import api from './api';

const DEFAULT_BRANCHES = [
  {
    id: 1,
    name: "Foodie Downtown (Main Branch)",
    code: "FD-MAIN-01",
    city: "Bangalore",
    address: "100ft Road, Indiranagar, Bangalore, Karnataka - 560038",
    phone: "+91 98765 43210",
    email: "indiranagar@foodierestaurant.com",
    managerName: "Rajesh Sharma",
    openingHours: "10:00 AM - 11:30 PM",
    tablesCount: 30,
    status: "Active",
    isMainBranch: true,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: 2,
    name: "Foodie Tech Park Galleria",
    code: "FD-TECH-02",
    city: "Bangalore",
    address: "Outer Ring Road, Bellandur, Bangalore, Karnataka - 560103",
    phone: "+91 98765 43211",
    email: "bellandur@foodierestaurant.com",
    managerName: "Ananya Roy",
    openingHours: "11:00 AM - 11:00 PM",
    tablesCount: 24,
    status: "Active",
    isMainBranch: false,
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: 3,
    name: "Foodie CyberCity Hub",
    code: "FD-CYBER-03",
    city: "Hyderabad",
    address: "Hitech City, Madhapur, Hyderabad, Telangana - 500081",
    phone: "+91 98765 43212",
    email: "hitech@foodierestaurant.com",
    managerName: "Vikram Reddy",
    openingHours: "11:00 AM - 12:00 AM",
    tablesCount: 36,
    status: "Active",
    isMainBranch: false,
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: 4,
    name: "Foodie Sea Breeze Pavilion",
    code: "FD-BEACH-04",
    city: "Goa",
    address: "Calangute Beach Road, North Goa - 403516",
    phone: "+91 98765 43213",
    email: "goa@foodierestaurant.com",
    managerName: "Pooja Hegde",
    openingHours: "12:00 PM - 01:00 AM",
    tablesCount: 20,
    status: "Under Renovation",
    isMainBranch: false,
    image: "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&auto=format&fit=crop&q=80"
  }
];

const STORAGE_KEY = 'foodie_restaurant_branches';

export const branchService = {
  getBranches: async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BRANCHES));
      return DEFAULT_BRANCHES;
    } catch (e) {
      console.error("Error reading branches from storage:", e);
      return DEFAULT_BRANCHES;
    }
  },

  getBranchById: async (id) => {
    const branches = await branchService.getBranches();
    return branches.find(b => Number(b.id) === Number(id)) || null;
  },

  createBranch: async (branchData) => {
    const branches = await branchService.getBranches();
    const newBranch = {
      id: Date.now(),
      name: branchData.name || 'New Branch',
      code: branchData.code || `FD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      city: branchData.city || 'Bangalore',
      address: branchData.address || '',
      phone: branchData.phone || '',
      email: branchData.email || '',
      managerName: branchData.managerName || 'Store Manager',
      openingHours: branchData.openingHours || '10:00 AM - 11:00 PM',
      tablesCount: Number(branchData.tablesCount || 20),
      status: branchData.status || 'Active',
      isMainBranch: Boolean(branchData.isMainBranch),
      image: branchData.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80'
    };

    // If marked as main branch, unmark other main branches
    let updatedBranches;
    if (newBranch.isMainBranch) {
      updatedBranches = branches.map(b => ({ ...b, isMainBranch: false }));
      updatedBranches.push(newBranch);
    } else {
      updatedBranches = [...branches, newBranch];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBranches));
    try {
      window.dispatchEvent(new CustomEvent('foodie_branches_updated', { detail: { branch: newBranch } }));
    } catch (e) {}

    return newBranch;
  },

  updateBranch: async (id, branchData) => {
    const branches = await branchService.getBranches();
    const updatedBranches = branches.map(b => {
      if (Number(b.id) === Number(id)) {
        return {
          ...b,
          ...branchData,
          id: b.id, // preserve ID
          tablesCount: branchData.tablesCount !== undefined ? Number(branchData.tablesCount) : b.tablesCount
        };
      }
      // If the updated branch is main, unmark others
      if (branchData.isMainBranch && Number(b.id) !== Number(id)) {
        return { ...b, isMainBranch: false };
      }
      return b;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBranches));
    try {
      window.dispatchEvent(new CustomEvent('foodie_branches_updated'));
    } catch (e) {}

    return updatedBranches.find(b => Number(b.id) === Number(id));
  },

  deleteBranch: async (id) => {
    const branches = await branchService.getBranches();
    const target = branches.find(b => Number(b.id) === Number(id));
    if (target?.isMainBranch) {
      throw new Error("Main / Headquarters branch cannot be deleted.");
    }

    const filtered = branches.filter(b => Number(b.id) !== Number(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    try {
      window.dispatchEvent(new CustomEvent('foodie_branches_updated'));
    } catch (e) {}

    return true;
  }
};

export default branchService;
