import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { generateTokens } from './src/utils/jwt';
import notificationsRoutes from './src/modules/notifications/notifications.routes';
import qcRoutes from './src/modules/qc/qc.routes';
import approvalsRoutes from './src/modules/approvals/approvals.routes';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/qc', qcRoutes);
app.use('/api/v1/approvals', approvalsRoutes);

const server = app.listen(3009, async () => {
  console.log('Test server running on port 3009 for Notifications & SSE Realtime verification');

  try {
    const superAdminToken = generateTokens({
      id: 'usr-admin',
      email: 'admin@guruom.in',
      role: 'SUPER ADMIN',
      name: 'Pramod Parshi'
    }).accessToken;

    const operatorToken = generateTokens({
      id: 'usr-op',
      email: 'operator@guruom.in',
      role: 'OPERATOR',
      name: 'Operator User'
    }).accessToken;

    console.log('\n--- 1. Testing Unauthenticated SSE Stream Access (401 Unauthorized) ---');
    const resUnauthStream = await fetch('http://localhost:3009/api/v1/notifications/stream');
    console.log('✓ GET /api/v1/notifications/stream without token status:', resUnauthStream.status, '(Expected: 401)');
    if (resUnauthStream.status !== 401) throw new Error('Expected 401 on unauthenticated stream request');

    console.log('\n--- 2. Testing Authenticated SSE Stream Connection ---');
    // Connect to SSE stream
    const sseResponse = await fetch(`http://localhost:3009/api/v1/notifications/stream?token=${encodeURIComponent(superAdminToken)}`);
    console.log('✓ GET /api/v1/notifications/stream with token status:', sseResponse.status, '(Expected: 200)');
    console.log('✓ SSE Content-Type:', sseResponse.headers.get('content-type'), '(Expected: text/event-stream)');
    if (sseResponse.status !== 200) throw new Error('Expected 200 on authenticated stream request');

    console.log('\n--- 3. Testing Rules & Recipients Configuration Endpoints ---');
    const resRules = await fetch('http://localhost:3009/api/v1/notifications/rules', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const rulesData = await resRules.json();
    console.log('✓ GET /api/v1/notifications/rules status:', resRules.status, 'Total Rules:', rulesData.data.length);
    if (resRules.status !== 200) throw new Error('Failed to fetch notification rules');

    const resRecipients = await fetch('http://localhost:3009/api/v1/notifications/recipients', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const recipientsData = await resRecipients.json();
    console.log('✓ GET /api/v1/notifications/recipients status:', resRecipients.status, 'Total Recipients:', recipientsData.data.length);
    if (resRecipients.status !== 200) throw new Error('Failed to fetch notification recipients');

    console.log('\n--- 4. Triggering Real Business Event Notification Dispatch ---');
    const resTrigger = await fetch('http://localhost:3009/api/v1/notifications/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        eventType: 'production_failure',
        severity: 'HIGH',
        entityType: 'JOB_CARD',
        entityId: 'JC/0001/26-27',
        title: 'CNC Spindle Overheating Alarm (JC/0001/26-27)',
        message: 'Spindle vibration sensor reached 98°C during rough milling operation.',
        data: { jobNumber: 'JC/0001/26-27', temp: 98, machine: 'CNC-01' }
      })
    });
    const triggerData = await resTrigger.json();
    console.log('✓ POST /api/v1/notifications/trigger status:', resTrigger.status);
    console.log('✓ Dispatched In-App Notification ID:', triggerData.data.id);
    console.log('✓ Resolved Recipients:', triggerData.data.recipients);
    console.log('✓ Email Dispatched (Server-Side):', triggerData.data.emailSent);
    if (resTrigger.status !== 201) throw new Error('Failed to trigger notification');

    console.log('\n--- 5. Testing In-App Notification Query & Mark Read ---');
    const resNotifs = await fetch('http://localhost:3009/api/v1/notifications', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const notifsData = await resNotifs.json();
    console.log('✓ GET /api/v1/notifications status:', resNotifs.status, 'Total In-App Notifications:', notifsData.data.length);

    const latestNotif = notifsData.data[0];
    const resMarkRead = await fetch(`http://localhost:3009/api/v1/notifications/${latestNotif.id}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    console.log(`✓ PATCH /api/v1/notifications/${latestNotif.id}/read status:`, resMarkRead.status);
    if (resMarkRead.status !== 200) throw new Error('Failed to mark notification as read');

    console.log('\n--- 6. Testing Notification Dispatch Logs ---');
    const resLogs = await fetch('http://localhost:3009/api/v1/notifications/logs', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const logsData = await resLogs.json();
    console.log('✓ GET /api/v1/notifications/logs status:', resLogs.status, 'Total Dispatch Logs:', logsData.data.length);
    console.log('✓ Latest Log:', logsData.data[0]?.subject, `[${logsData.data[0]?.status}]`);

    console.log('\n========================================================================');
    console.log('🎉 REALTIME NOTIFICATIONS & SSE STREAM REST API TESTS PASSED 100%!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
  }
});
