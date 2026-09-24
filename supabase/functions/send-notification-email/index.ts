declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) 
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const {
      eventType, 
      entityType, 
      entityId, 
      title: inputTitle, 
      message: inputMessage, 
      data: payloadData = {}, 
      recipientEmail, 
      isTest = false 
    } = body;

    if (!eventType && !isTest) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: eventType" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // ----------------------------------------------------
    // HANDLE DIRECT TEST EMAIL DISPATCH
    // ----------------------------------------------------
    if (isTest || eventType === "test_email") {
      const targetEmail = recipientEmail || "admin@guruom.in";
      const testSubject = inputTitle || `[GuruOm OS Test] Resend Notification Service Verification`;
      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background: #16171B; padding: 24px; text-align: center; border-bottom: 3px solid #5B75F8;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px;">GURUOM INDUSTRIES</h1>
            <p style="color: #5B75F8; margin: 4px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">SketchItUp Owner OS • Notification Gateway</p>
          </div>
          <div style="padding: 24px; color: #1e293b;">
            <h2 style="color: #0f172a; margin-top: 0;">Resend Edge Function Verified</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              This test notification was dispatched securely via <strong>Supabase Edge Function</strong> using server-side <strong>RESEND_API_KEY</strong> secrets.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 13px;">
              <div><strong>Recipient:</strong> ${targetEmail}</div>
              <div><strong>Environment:</strong> Supabase Edge Functions</div>
              <div><strong>Timestamp:</strong> ${new Date().toUTCString()}</div>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b;">
            GuruOm SketchItUp Owner OS Automated Notification Service
          </div>
        </div>
      `;

      let resendId = null;
      let sendStatus = "SENT";
      let errorMsg = null;

      if (resendApiKey) {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: [targetEmail],
            subject: testSubject,
            html: testHtml
          })
        });

        const resendData = await resendRes.json();
        if (resendRes.ok) {
          resendId = resendData.id;
        } else {
          sendStatus = "FAILED";
          errorMsg = resendData.message || resendData.name || "Resend API error";
        }
      } else {
        sendStatus = "FAILED";
        errorMsg = "RESEND_API_KEY secret is not set in Supabase Edge Function environment.";
      }

      // Log test attempt
      await supabase.from("notification_logs").insert({
        event_type: "test_email",
        recipient_email: targetEmail,
        subject: testSubject,
        status: sendStatus,
        resend_email_id: resendId,
        error_message: errorMsg,
        created_at: new Date().toISOString(),
        sent_at: sendStatus === "SENT" ? new Date().toISOString() : null
      });

      return new Response(
        JSON.stringify({ 
          success: sendStatus === "SENT", 
          resendEmailId: resendId, 
          error: errorMsg,
          message: sendStatus === "SENT" ? "Test email sent successfully via Resend Edge Function!" : errorMsg 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: sendStatus === "SENT" ? 200 : 400 }
      );
    }

    // ----------------------------------------------------
    // 1. FETCH & VALIDATE NOTIFICATION RULE FROM DATABASE
    // ----------------------------------------------------
    const { data: rule, error: ruleError } = await supabase
      .from("notification_rules")
      .select("*")
      .eq("id", eventType)
      .maybeSingle();

    if (ruleError || !rule) {
      return new Response(
        JSON.stringify({ error: `Notification rule for event '${eventType}' not found in database.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (!rule.enabled) {
      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: `Notification rule '${rule.name}' is currently disabled.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ----------------------------------------------------
    // 2. FETCH RECIPIENTS & RESOLVE ROLES/EMAILS
    // ----------------------------------------------------
    const { data: recipients, error: recipError } = await supabase
      .from("notification_recipients")
      .select("*")
      .eq("notification_rule_id", eventType)
      .eq("enabled", true);

    if (recipError) {
      return new Response(
        JSON.stringify({ error: `Error fetching recipients: ${recipError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Fetch user profiles for resolving role recipients
    const { data: profiles } = await supabase.from("profiles").select("*");

    const resolvedEmails = new Set<string>();
    const defaultRoleEmails: Record<string, string[]> = {
      "SUPER ADMIN": ["admin@guruom.in", "owner@guruom.in"],
      "OPERATOR": ["production@guruom.in", "stores@guruom.in"],
      "QC_MANAGER": ["qc@guruom.in"],
      "DISPATCH_CLERK": ["dispatch@guruom.in", "sales@guruom.in"],
      "FINANCE_MANAGER": ["finance@guruom.in"]
    };

    interface Recipient {
      recipient_type: string;
      recipient_value: string;
      email?: string;
    }

    interface Profile {
      id?: string;
      user_id?: string;
      role?: string;
      email?: string;
    }

    (recipients as Recipient[] || []).forEach((r: Recipient) => {
      if (r.recipient_type === "EMAIL" && (r.email || r.recipient_value)) {
        resolvedEmails.add(r.email || r.recipient_value);
      } else if (r.recipient_type === "ROLE") {
        const matchingProfiles = (profiles as Profile[] || []).filter((p: Profile) => p.role === r.recipient_value && p.email);
        if (matchingProfiles.length > 0) {
          matchingProfiles.forEach((p: Profile) => { if (p.email) resolvedEmails.add(p.email); });
        } else if (defaultRoleEmails[r.recipient_value]) {
          defaultRoleEmails[r.recipient_value].forEach((e: string) => resolvedEmails.add(e));
        }
      } else if (r.recipient_type === "USER") {
        const userProf = (profiles as Profile[] || []).find((p: Profile) => p.user_id === r.recipient_value || p.id === r.recipient_value);
        if (userProf?.email) resolvedEmails.add(userProf.email);
        else if (r.email) resolvedEmails.add(r.email);
      }
    });

    // If explicit recipientEmail passed in request payload, include it
    if (recipientEmail) resolvedEmails.add(recipientEmail);

    const targetList = Array.from(resolvedEmails);

    if (targetList.length === 0) {
      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: `No enabled recipients configured for event '${eventType}'` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ----------------------------------------------------
    // 3. GENERATE EMAIL CONTENT & BRANDED TEMPLATE
    // ----------------------------------------------------
    const severityColorMap: Record<string, string> = {
      CRITICAL: "#ef4444",
      HIGH: "#f97316",
      MEDIUM: "#eab308",
      LOW: "#3b82f6",
      INFO: "#10b981"
    };
    const severityColor = severityColorMap[rule.severity] || "#5B75F8";

    const title = inputTitle || `${rule.name}`;
    const message = inputMessage || rule.description || `Event ${eventType} occurred in Owner OS.`;
    const subject = `[${rule.severity}] ${title} ${entityId ? `(#${entityId})` : ''}`;

    let dataRowsHtml = '';
    if (payloadData && typeof payloadData === 'object') {
      dataRowsHtml = Object.entries(payloadData)
        .map(([k, v]) => `
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 12px; font-family: monospace;">${k.toUpperCase()}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px;">${String(v)}</td>
          </tr>
        `).join('');
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        {/* Header */}
        <div style="background: #16171B; padding: 28px 24px; text-align: center; border-bottom: 4px solid ${severityColor};">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1.5px;">GURUOM INDUSTRIES</h1>
          <div style="margin-top: 6px; display: inline-block; padding: 4px 12px; background: rgba(91, 117, 248, 0.15); border: 1px solid ${severityColor}; border-radius: 20px; color: ${severityColor}; font-size: 11px; font-weight: bold; font-family: monospace;">
            ${rule.severity} EVENT ALERT
          </div>
        </div>

        {/* Body Content */}
        <div style="padding: 28px 24px; color: #1e293b;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">${title}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
            ${message}
          </p>

          {/* Event Metadata Table */}
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
            <tbody>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 12px; font-family: monospace;">EVENT TYPE</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px;">${eventType}</td>
              </tr>
              ${entityType ? `
                <tr>
                  <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 12px; font-family: monospace;">ENTITY</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px;">${entityType} ${entityId ? `(#${entityId})` : ''}</td>
                </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 12px; font-family: monospace;">TIMESTAMP</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px;">${new Date().toLocaleString()}</td>
              </tr>
              ${dataRowsHtml}
            </tbody>
          </table>

          {/* Action CTA */}
          <div style="text-align: center; margin-top: 28px;">
            <a href="https://guruom.in" style="background: #5B75F8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 13px; display: inline-block;">
              Open in Owner OS Console
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          GuruOm SketchItUp Owner OS • Automated Resend Email Notification System
        </div>
      </div>
    `;

    // ----------------------------------------------------
    // 4. DISPATCH EMAIL VIA RESEND API & LOG OUTCOMES
    // ----------------------------------------------------
    const logs = [];

    for (const email of targetList) {
      let sendStatus = "SENT";
      let resendId = null;
      let errorMsg = null;

      if (resendApiKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
              from: resendFromEmail,
              to: [email],
              subject,
              html: htmlContent
            })
          });

          const resData = await res.json();
          if (res.ok) {
            resendId = resData.id;
          } else {
            sendStatus = "FAILED";
            errorMsg = resData.message || resData.name || "Resend API error";
          }
        } catch (err: any) {
          sendStatus = "FAILED";
          errorMsg = err.message || "Network failure invoking Resend API";
        }
      } else {
        sendStatus = "FAILED";
        errorMsg = "RESEND_API_KEY secret is not set in Supabase Edge Function environment.";
      }

      // Record log entry in notification_logs table
      const { data: logEntry } = await supabase.from("notification_logs").insert({
        event_type: eventType,
        recipient_email: email,
        subject,
        status: sendStatus,
        resend_email_id: resendId,
        error_message: errorMsg,
        entity_type: entityType || null,
        entity_id: entityId || null,
        created_at: new Date().toISOString(),
        sent_at: sendStatus === "SENT" ? new Date().toISOString() : null
      }).select().maybeSingle();

      logs.push(logEntry || { recipient_email: email, status: sendStatus, error: errorMsg });
    }

    // ----------------------------------------------------
    // 5. INSERT IN-APP REALTIME NOTIFICATION RECORD
    // ----------------------------------------------------
    await supabase.from("notifications").insert({
      type: eventType,
      title,
      message,
      severity: rule.severity,
      entity_type: entityType || null,
      entity_id: entityId || null,
      is_read: false,
      created_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventType, 
        recipientsCount: targetList.length,
        recipients: targetList, 
        logs 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error in notification Edge Function" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
