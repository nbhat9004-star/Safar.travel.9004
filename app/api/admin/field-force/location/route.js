import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getCurrentUser, requireRole } from '@/lib/auth';
const json=(data,status=200)=>NextResponse.json(data,{status});
export async function GET(request){const me=await getCurrentUser(request);const auth=requireRole(me,['admin','super_admin']);if(!auth.ok)return json({ok:false,error:auth.error},auth.status);const rows=await (await getCollection('employeeLocationLatest')).find({sharingEnabled:true,updatedAt:{$gte:new Date(Date.now()-10*60*1000)}},{projection:{_id:0}}).sort({updatedAt:-1}).limit(500).toArray();return json({ok:true,locations:rows});}
