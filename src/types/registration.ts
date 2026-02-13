export interface Director {
  name: string;
  idNumber: string;
  idPhotoUrl: string;
  idPhotoFile?: File;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface BusinessRegistrationData {
  // Step 1: Business Details
  registeredName: string;
  businessNumber: string;
  tradingName: string;
  phone: string;
  physicalAddress: Address;
  postalAddress: Address;
  sameAsPhysical: boolean;
  
  // Step 2: Director Information
  directors: Director[];
  
  // Step 3: Account Setup
  email: string;
  password: string;
  confirmPassword: string;
  
  // Payment
  subscriptionTier: 'monthly' | 'annual';
  paymentMethod: 'card' | 'eft';
}

export interface RegistrationResponse {
  success: boolean;
  businessId?: string;
  error?: string;
  redirectUrl?: string;
}
