import crypto from 'crypto';
import { getDbClient } from '../backend/src/config/database';
import { hashPassword } from '../backend/src/utils/password';

async function seed() {
    const email = 'owner@guruom.in';
    const rawPassword = 'Pass@123';
    const fullName = 'Company Owner';
    const role = 'Owner';

    console.log(`\n⏳ Hashing password and connecting to database for ${email}...`);
    const passwordHash = await hashPassword(rawPassword);
    const db = getDbClient();

    const { data: existingUser } = await db
        .from('users')
        .select('id, email, role')
        .eq('email', email.toLowerCase())
        .maybeSingle();

    if (existingUser) {
        console.log(`Found existing user ${existingUser.id}. Resetting password/role...`);
        const { error } = await db
            .from('users')
            .update({
                role,
                password_hash: passwordHash,
                full_name: fullName,
                status: 'ACTIVE',
                failed_login_attempts: 0,
                lockout_until: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id);
        if (error) { console.error('❌ Update failed:', error.message); process.exit(1); }
    } else {
        const id = crypto.randomUUID();
        console.log(`Creating new Owner user with ID: ${id}...`);
        const { error } = await db.from('users').insert({
            id,
            email,
            full_name: fullName,
            password_hash: passwordHash,
            role,
            status: 'ACTIVE',
            is_temporary_password: false,
            failed_login_attempts: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        if (error) { console.error('❌ Insert failed:', error.message); process.exit(1); }
    }

    console.log(`\n🎉 Owner account ready: ${email} / ${rawPassword} (ACTIVE)\n`);
}

seed().catch((err) => { console.error('❌ Error:', err); process.exit(1); });