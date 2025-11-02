// import * as AuthSession from "expo-auth-session";
// import * as WebBrowser from "expo-web-browser";
// import { Platform } from "react-native";

// import Constants from "expo-constants";

// // Nécessaire pour que WebBrowser fonctionne correctement
// WebBrowser.maybeCompleteAuthSession();

// const discovery = {
//   authorizationEndpoint: "https://www.chess.com/oauth/authorize",
//   tokenEndpoint: "https://api.chess.com/v1/oauth/token",
// };

// export interface ChessComOAuthResult {
//   accessToken: string;
//   tokenType: string;
//   expiresIn: number;
//   refreshToken?: string;
//   username?: string;
// }

// /**
//  * Initie le flow OAuth pour Chess.com
//  * @returns Les tokens et informations utilisateur
//  */
// export const initiateChessComOAuth = async (): Promise<ChessComOAuthResult> => {
//   const clientId = process.env.EXPO_PUBLIC_CHESSCOM_CLIENT_ID;

//   if (!clientId) {
//     throw new Error("EXPO_PUBLIC_CHESSCOM_CLIENT_ID is not set");
//   }

//   // Déterminer le redirect URI selon la plateforme
//   const redirectUriValue = AuthSession.makeRedirectUri({
//     scheme: Constants.expoConfig?.scheme || "expo-supabase-starter",
//     path: "oauth/chesscom",
//   });
//   const redirectUri =
//     typeof redirectUriValue === "string"
//       ? redirectUriValue
//       : redirectUriValue[0];

//   // Configuration de la requête
//   const request = new AuthSession.AuthRequest({
//     clientId,
//     scopes: [],
//     responseType: AuthSession.ResponseType.Code,
//     redirectUri,
//     usePKCE: false, // Chess.com n'utilise pas PKCE standardement
//   });

//   // Lancer l'authentification
//   const result = await request.promptAsync(discovery, {
//     showInRecents: true,
//   });

//   if (result.type === "error") {
//     throw new Error(result.error?.message || "OAuth error");
//   }

//   if (result.type !== "success") {
//     throw new Error("OAuth was cancelled or failed");
//   }

//   const code = result.params.code;
//   const codeValue = Array.isArray(code) ? code[0] : code;

//   if (!codeValue || typeof codeValue !== "string") {
//     throw new Error("No authorization code received");
//   }

//   // Échanger le code contre un token
//   const tokenResponse = await fetch(discovery.tokenEndpoint, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//     body: new URLSearchParams({
//       grant_type: "authorization_code",
//       code: codeValue,
//       client_id: clientId,
//       client_secret: process.env.EXPO_PUBLIC_CHESSCOM_CLIENT_SECRET || "",
//       redirect_uri: redirectUri,
//     }),
//   });

//   if (!tokenResponse.ok) {
//     const error = await tokenResponse.text();
//     throw new Error(`Token exchange failed: ${error}`);
//   }

//   const tokenData = await tokenResponse.json();

//   // Récupérer les infos utilisateur avec le token
//   const userResponse = await fetch("https://api.chess.com/v1/user", {
//     headers: {
//       Authorization: `Bearer ${tokenData.access_token}`,
//     },
//   });

//   let username: string | undefined;
//   if (userResponse.ok) {
//     const userData = await userResponse.json();
//     username = userData?.username;
//   }

//   return {
//     accessToken: tokenData.access_token,
//     tokenType: tokenData.token_type || "Bearer",
//     expiresIn: tokenData.expires_in || 3600,
//     refreshToken: tokenData.refresh_token,
//     username,
//   };
// };
