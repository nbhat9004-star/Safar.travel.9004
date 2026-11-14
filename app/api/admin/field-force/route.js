import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getCollection } from '@/lib/db';
import { getCurrentUser, requireRole, hashPassword } from '@/lib/auth';

const json = (data, status=200) => NextResponse.json(data, {status});
const deny = (auth) => json({ok:false,error:auth.error}, auth.status);

export async function GET(request) {
  const me = await getCurrentUser(request);
  const auth = requireRole(me, ['super_admin']);
  if (!auth.ok) return deny(auth);
  const employees = await getCollection('users');
  const rows = await employees.find({ role:'employee' }, {projection:{passwordHash:0}}).sort({createdAt:-1}).limit(500).toArray();
  return json({ok:true, employees:rows});
}

export async function POST(request) {
  const me = await getCurrentUser(request);
  const auth = requireRole(me, ['super_admin']);
  if (!auth.ok) return deny(auth);
  const body = await request.json().catch(()=>({}));
  const name = String(body.name||'').trim();
  const email = String(body.email||'').trim().toLowerCase();
  const password = String(body.password||'');
  const phone = String(body.phone||'').trim();
  const territory = String(body.territory||'').trim();
  if (name.length<2 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || password.length<8) {
    return json({ok:false,error:'Enter a name, valid email and password of at least 8 characters.'},400);
  }
  const users = await getCollection('users');
  if (await users.findOne({email})) return json({ok:false,error:'An account with this email already exists.'},409);
  const now = new Date();
  const employee = {
    id:uuid(), name, email, role:'employee', phone, territory,
    passwordHash:await hashPassword(password), emailVerified:true,
    employeeStatus:'active', createdBy:me.id, createdAt:now, updatedAt:now,
  };
  await users.insertOne(employee);
  const {passwordHash, _id, ...safe} = employee;
  return json({ok:true, employee:safe},201);
}

export async function PATCH(request) {
  const me = await getCurrentUser(request);
  const auth = requireRole(me, ['super_admin']);
  if (!auth.ok) return deny(auth);
  const body = await request.json().catch(()=>({}));
  if (!body.id || !['active','suspended'].includes(body.employeeStatus)) return json({ok:false,error:'Employee id and valid status are required.'},400);
  const users = await getCollection('users');
  const result = await users.updateOne({id:body.id,role:'employee'},{$set:{employeeStatus:body.employeeStatus,updatedAt:new Date()}});
  if (!result.matchedCount) return json({ok:false,error:'Employee not found.'},404);
  return json({ok:true});
}
