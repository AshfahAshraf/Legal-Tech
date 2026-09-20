// Utility to get logged-in user details from local storage JWT token

export const getLoggedInUser = () => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Check expiration (exp is in seconds)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem("token");
      return null;
    }
    return payload;
  } catch (e) {
    console.error("Failed to parse token:", e);
    return null;
  }
};

export const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
