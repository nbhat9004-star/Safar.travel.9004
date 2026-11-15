import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
const json=(data,status=200)=>NextResponse.json(data,{status});
export async function GET(request){const me=await getCurrentUser(request);if(!me||me.role!=='employee'||me.employeeStatus==='suspended')return json({ok:false,error:'Active employee login required.'},401);const {passwordHash,resetToken,resetTokenExpiry,_id,...safe}=me;return json({ok:true,profile:safe});}
export async function PATCH(request){const me=await getCurrentUser(request);if(!me||me.role!=='employee'||me.employeeStatus==='suspended')return json({ok:false,error:'Active employee login required.'},401);const b=await request.json().catch(()=>({}));const update={updatedAt:new Date()};if(typeof b.name==='string'&&b.name.trim().length>=2)update.name=b.name.trim();if(typeof b.phone==='string')update.phone=b.phone.trim().slice(0,30);if(typeof b.avatar==='string')update.avatar=b.avatar.slice(0,1000);await (await getCollection('users')).updateOne({id:me.id,role:'employee'},{$set:update});return json({ok:true});}
