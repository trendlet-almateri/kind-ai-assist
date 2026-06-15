/**
 * app/api/notifications/order-status/route.ts
 *
 * Mirrors an outbound order-status WhatsApp (sent by Trendlet via Twilio) into
 * this inbox, so support agents see "this message went to this customer" in the
 * customer's own conversation thread.
 *
 * WHY a separate endpoint (not a shared DB write):
 * - Trendlet and kind-ai are SEPARATE Supabase projects. Trendlet can't write
 *   to this DB directly without embedding our service-role key. Instead Trendlet
 *   POSTs here with a shared bearer token; we do the privileged write locally.
 *
 * Auth: Bearer token in the Authorization header, compared to
 * NOTIFICATIONS_API_TOKEN. Machine-to-machine — no user session.
 *
 * Flow:
 *   1. Verify bearer token
 *   2. Normalize the destination phone to canonical E.164 (+...)
 *   3. Find-or-create the conversation for that phone
 *   4. Insert an 'agent'-role message so it renders in the inbox
 *   5. Log to twilio_messages (direction 'outbound')
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

import { getSupabaseAdminClient } from "@/server/supabase/admin";
import { normalizePhone } from "@/lib/phone";

type Body = {
  phone: string;
  message: string;
  /** Twilio message SID, if the send succeeded. Optional. */
  message_sid?: string | null;
  /** Customer display name, when Trendlet knows it. Optional. */
  customer_name?: string | null;
};

export async function POST(req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const expected = process.env.NOTIFICATIONS_API_TOKEN;
  if (!expected) {
    console.error("[order-status] NOTIFICATIONS_API_TOKEN is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Parse + validate ──────────────────────────────────────────────────────
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone);
  const message = body.message?.trim();
  if (!phone || !message) {
    return NextResponse.json({ error: "phone and message are required" }, { status: 400 });
  }

  const db = getSupabaseAdminClient();

  // ── 2. Find-or-create conversation ────────────────────────────────────────
  // Match on the canonical phone. Reuse the most recent non-deleted thread
  // regardless of status so a resolved/closed thread still receives the update
  // rather than spawning a duplicate.
  const { data: existing, error: findErr } = await db
    .from("conversations")
    .select("id, workspace_id, customer_name")
    .eq("customer_phone", phone)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    console.error("[order-status] find-conversation failed:", findErr);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }

  let conversationId: string;
  let workspaceId: string;

  if (existing) {
    conversationId = existing.id;
    workspaceId = existing.workspace_id;
    if (!existing.customer_name && body.customer_name) {
      await db
        .from("conversations")
        .update({ customer_name: body.customer_name })
        .eq("id", conversationId);
    }
  } else {
    const { data: workspace, error: wsErr } = await db
      .from("workspaces")
      .select("id")
      .limit(1)
      .single();
    if (wsErr || !workspace) {
      console.error("[order-status] workspace lookup failed:", wsErr);
      return NextResponse.json({ error: "no workspace" }, { status: 500 });
    }
    workspaceId = workspace.id;

    const { data: newConv, error: convErr } = await db
      .from("conversations")
      .insert({
        workspace_id: workspaceId,
        channel: "whatsapp",
        customer_phone: phone,
        customer_name: body.customer_name ?? null,
        status: "open",
        is_ai_active: true,
        metadata: { source: "trendlet-order-notification" },
      })
      .select("id")
      .single();

    if (convErr || !newConv) {
      console.error("[order-status] insert-conversation failed:", convErr);
      return NextResponse.json({ error: "create failed" }, { status: 500 });
    }
    conversationId = newConv.id;
  }

  // ── 3. Insert the outbound message (renders in the inbox) ──────────────────
  // role 'agent' so it shows as an outbound bubble, attributed to the system.
  const { error: msgErr } = await db.from("messages").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    role: "agent",
    content: message,
    sender_name: "Order Updates",
    is_read: true,
    wa_message_id: body.message_sid ?? null,
    metadata: { source: "trendlet-order-notification", twilio_sid: body.message_sid ?? null },
  });
  if (msgErr) {
    console.error("[order-status] insert-message failed:", msgErr);
    return NextResponse.json({ error: "message insert failed" }, { status: 500 });
  }

  // ── 4. Log to twilio_messages (outbound) ──────────────────────────────────
  await db.from("twilio_messages").insert({
    workspace_id: workspaceId,
    message_sid: body.message_sid ?? null,
    from_number: process.env.TWILIO_WHATSAPP_FROM ?? null,
    to_number: phone,
    body: message,
    direction: "outbound",
    conversation_id: conversationId,
    raw_payload: { source: "trendlet-order-notification" },
  });

  return NextResponse.json({ ok: true, conversation_id: conversationId }, { status: 200 });
}
