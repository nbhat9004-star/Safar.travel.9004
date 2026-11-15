import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getCollection } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const json=(data,status=200)=>NextResponse.json(data,{status});
async function employee(request) {
  const me=await getCurrentUser(request);
  if (!me || me.role!=='employee' || me.employeeStatus==='suspended') return null;
  return me;
}
export async function GET(request) {
  const me=await employee(request);
  if (!me) return json({ok:false,error:'Active employee login required.'},401);
  const visits=await getCollection('employeeVisits');
  const rows=await visits.find({employeeId:me.id}).sort({createdAt:-1}).limit(100).toArray();
  return json({ok:true,visits:rows});
}
export async function POST(request) {
  const me=await employee(request);
  if (!me) return json({ok:false,error:'Active employee login required.'},401);
  const body=await request.json().catch(()=>({}));
  const hostName=String(body.hostName||'').trim();
  const phone=String(body.phone||'').trim();
  const address=String(body.address||'').trim();
  const notes=String(body.notes||'').trim();
  const lat=Number(body.latitude), lng=Number(body.longitude);
  if (hostName.length<2 || !phone || !Number.isFinite(lat) || !Number.isFinite(lng)) return json({ok:false,error:'Host name, phone and GPS coordinates are required.'},400);
  const visit={id:uuid(),employeeId:me.id,employeeName:me.name,hostName,phone,address,notes,latitude:lat,longitude:lng,status:'submitted',createdAt:new Date()};
  await (await getCollection('employeeVisits')).insertOne(visit);
  return json({ok:true,visit},201);
}
