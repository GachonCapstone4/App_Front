import { api } from "./http";

type TokenLoginApiResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type AuthorizationUrlApiResponse = {
  authorization_url: string;
};

type UserProfileApiResponse = {
  user_id: number;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  created_at: string;
};

export type CurrentUserProfile = {
  userId: number;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  createdAt: string;
};

export async function loginWithPassword(email: string, password: string) {
  const response = await api.post<TokenLoginApiResponse>("/api/auth/tokens", {
    email,
    password,
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
    tokenType: response.data.token_type,
  };
}

export async function signupUser(name: string, email: string, password: string) {
  await api.post("/api/users", {
    name,
    email,
    password,
  });
}

export async function getGoogleSignupAuthorizationUrl() {
  const response = await api.get<AuthorizationUrlApiResponse>("/api/auth/google/signup-url");
  return response.data.authorization_url;
}

export async function completeGoogleSignup(tempToken: string, password: string) {
  const response = await api.post<TokenLoginApiResponse>("/api/auth/google/signup", {
    temp_token: tempToken,
    password,
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
    tokenType: response.data.token_type,
  };
}

export async function getMyProfile(): Promise<CurrentUserProfile> {
  const response = await api.get<UserProfileApiResponse>("/api/users/me");

  return {
    userId: response.data.user_id,
    email: response.data.email,
    name: response.data.name,
    role: response.data.role,
    createdAt: response.data.created_at,
  };
}

export async function updateMyProfile(name: string) {
  await api.patch("/api/users/me", { name });
  return getMyProfile();
}

export async function changeMyPassword(oldPassword: string, newPassword: string) {
  await api.patch("/api/users/me/password", {
    old_password: oldPassword,
    new_password: newPassword,
  });
}

export async function sendPasswordResetCode(name: string, email: string) {
  await api.post("/api/auth/password-reset/code", {
    name,
    email,
  });
}

export async function verifyPasswordResetCode(
  email: string,
  code: string,
  newPassword: string,
) {
  await api.post("/api/auth/password-reset/verify", {
    email,
    code,
    new_password: newPassword,
  });
}

export async function deleteMyAccount() {
  await api.delete("/api/users/me");
}
