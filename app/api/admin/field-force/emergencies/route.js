import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getCurrentUser, requireRole } from '@/lib/auth';
const json=(data,status=200)=>NextResponse.json(data,{status});
export async function GET(request){const me=await getCurrentUser(request);const a=requireRole(me,['admin','super_admin']);if(!a.ok)return json({ok:false,error:a.error},a.status);const rows=await (await getCollection('employeeMessages')).find({isEmergency:true},{projection:{_id:0}}).sort({createdAt:-1}).limit(200).toArray();return json({ok:true,emergencies:rows});}
