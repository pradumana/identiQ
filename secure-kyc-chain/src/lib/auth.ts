import { User, UserRole } from "@/types/kyc";
import { authApi } from "./api";

const AUTH_TOKEN_KEY = "kyc_auth_token";
const USER_KEY = "kyc_user";

export interface AuthResponse {
  success: boolean;
  user?: User;
  access_token?: string;
  refresh_token?: string;
  error?: string;
}

// ------------------------
// FIXED LOGIN FUNCTION
// ------------------------
export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const response = (await authApi.login(email, password)) as any;

    // Backend returns:
    // success: true/false
    // user: {...}
    // access_token: "..."
    // refresh_token: "..."
    // error: null or error message

    if (response.success === true && response.user && response.access_token) {

      const user: User = {
        id: response.user.id,
        email: response.user.email,
        role: response.user.role as UserRole,
        created_at: response.user.created_at,
      };

      // Save token + user
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return {
        success: true,
        user,
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      };
    }

    return {
      success: false,
      error: response.error || "Login failed",
    };
  } catch (error: any) {
    // Handle fetch errors (network issues, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: "Unable to connect to server. Please check if the backend is running.",
      };
    }
    
    // Handle API errors
    if (error.message) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Login failed. Please check your credentials and try again.",
    };
  }
};

// ------------------------
// LOGOUT
// ------------------------
export const logout = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// ------------------------
// GET CURRENT USER
// ------------------------
export const getCurrentUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// ------------------------
// GET TOKEN
// ------------------------
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

// ------------------------
// CHECK IF AUTHENTICATED
// ------------------------
export const isAuthenticated = (): boolean => {
  return !!getAuthToken() && !!getCurrentUser();
};

// ------------------------
// ROLE CHECK
// ------------------------
export const hasRole = (allowedRoles: UserRole[]): boolean => {
  const user = getCurrentUser();
  return user ? allowedRoles.includes(user.role) : false;
};
