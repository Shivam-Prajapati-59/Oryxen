import { NextRequest, NextResponse } from "next/server";

const Testnet_URL = "https://test-api.pacifica.fi/api/v1";
const Mainnet_URL = "https://api.pacifica.fi/api/v1";

const API_BASE_URL = process.env.NEXT_PUBLIC_PACIFICA_API_URL || Testnet_URL;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("🔄 Proxying bind-agent to Pacifica:", {
      account: payload.account?.substring(0, 8) + "...",
      agent_wallet: payload.agent_wallet?.substring(0, 8) + "...",
    });

    // Forward the request to Pacifica API
    const response = await fetch(`${API_BASE_URL}/agent/bind`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Pacifica bind-agent error:", data);
      return NextResponse.json(
        { error: data.error || "Failed to bind agent wallet" },
        { status: response.status },
      );
    }

    console.log("✅ Agent wallet bound via API route:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error binding agent wallet:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
