import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://lichess.org/oauth",
  tokenEndpoint: "https://lichess.org/api/token",
};

export interface LichessOAuthResult {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  username?: string;
}

/**
 * Initie le flow OAuth pour Lichess
 * @returns Les tokens et informations utilisateur
 */
export const initiateLichessOAuth = async (): Promise<LichessOAuthResult> => {
  const clientId = process.env.EXPO_PUBLIC_LICHESS_CLIENT_ID;

  if (!clientId) {
    throw new Error("EXPO_PUBLIC_LICHESS_CLIENT_ID is not set");
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: (Constants.expoConfig?.scheme as string) || "chesscorrect",
    path: "oauth/lichess",
  });

  // Lichess utilise un flow simple sans PKCE
  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ["preference:read", "email:read"], // Scopes pour lire les infos utilisateur
    responseType: AuthSession.ResponseType.Code,
    redirectUri,
    usePKCE: false,
    extraParams: {
      response_type: "code",
    },
  });

  const result = await request.promptAsync(discovery, {
    showInRecents: true,
  });

  if (result.type === "error") {
    throw new Error(result.error?.message || "OAuth error");
  }

  if (result.type !== "success") {
    throw new Error("OAuth was cancelled or failed");
  }

  const code = result.params.code;
  const codeValue = Array.isArray(code) ? code[0] : code;

  if (!codeValue || typeof codeValue !== "string") {
    throw new Error("No authorization code received");
  }

  // Lichess utilise Basic Auth pour échanger le code
  const clientSecret = process.env.EXPO_PUBLIC_LICHESS_CLIENT_SECRET || "";
  // Utiliser btoa pour encoder en base64 (disponible dans React Native via expo-crypto ou global)
  const credentials = `${clientId}:${clientSecret}`;
  const authHeader = `Basic ${btoa(credentials)}`;

  const tokenResponse = await fetch(discovery.tokenEndpoint, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: codeValue,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokenData = await tokenResponse.json();

  // Récupérer les infos utilisateur
  const userResponse = await fetch("https://lichess.org/api/account", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  let username: string | undefined;
  if (userResponse.ok) {
    const userData = await userResponse.json();
    username = userData?.username;
  }

  return {
    accessToken: tokenData.access_token,
    tokenType: tokenData.token_type || "Bearer",
    expiresIn: tokenData.expires_in,
    username,
  };
};
