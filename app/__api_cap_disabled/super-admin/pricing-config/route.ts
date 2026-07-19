import { NextRequest, NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"
import { TIER_CONFIG, ADDON_CATALOG } from "@/lib/utils/pricing-utils"
import type { TierPlan } from "@/lib/utils/subscription-types"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const overrides = mockDB.getTierBaseOverrides()
    const tiers = (Object.keys(TIER_CONFIG) as TierPlan[]).map((id) => ({
      id,
      ...TIER_CONFIG[id],
      basePerStudentMonth: overrides[id] ?? TIER_CONFIG[id].basePerStudentMonth,
    }))
    return NextResponse.json({
      success: true,
      data: {
        tiers,
        addons: ADDON_CATALOG,
        rules: mockDB.getPricingRules(),
        overrides,
        addonOverrides: mockDB.getAddonOverrides(),
      },
    })
  } catch (error) {
    console.error("[v0] pricing-config GET:", error)
    return NextResponse.json({ success: false, error: "Failed to load pricing" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    if (body.tierBaseOverrides && typeof body.tierBaseOverrides === "object") {
      mockDB.setTierBaseOverrides(body.tierBaseOverrides)
    }
    if (body.pricingRule) {
      mockDB.upsertPricingRule(body.pricingRule)
    }
    if (body.addonOverride) {
      mockDB.upsertAddonOverride(body.addonOverride.id, body.addonOverride)
    }
    const overrides = mockDB.getTierBaseOverrides()
    return NextResponse.json({ success: true, data: { overrides, addonOverrides: mockDB.getAddonOverrides() } })
  } catch (error) {
    console.error("[v0] pricing-config PATCH:", error)
    return NextResponse.json({ success: false, error: "Failed to update pricing" }, { status: 500 })
  }
}



