import { NextResponse } from "next/server";

const Testnet_URL = "https://test-api.pacifica.fi/api/v1";
const Mainnet_URL = "https://api.pacifica.fi/api/v1";

const API_BASE_URL = process.env.NEXT_PUBLIC_PACIFICA_API_URL || Testnet_URL;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[Claim] Sending to Pacifica:", JSON.stringify(body, null, 2));

    const externalResponse = await fetch(`${API_BASE_URL}/whitelist/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Handle non-JSON responses gracefully
    const responseText = await externalResponse.text();
    console.log("[Claim] Response status:", externalResponse.status);
    console.log("[Claim] Response body:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // If Pacifica returns non-JSON (e.g. HTML error page), wrap it
      return NextResponse.json(
        {
          success: false,
          error: `Pacifica returned non-JSON: ${responseText}`,
        },
        { status: externalResponse.status },
      );
    }

    return NextResponse.json(data, { status: externalResponse.status });
  } catch (error) {
    console.error("[Claim] Server error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
